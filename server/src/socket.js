import db, { audit } from './db.js';
import { verifyToken } from './auth.js';
import { estimateFare, etaSeconds, coordsFor } from './campus.js';

function currentRideSeq() {
  const row = db.prepare("SELECT MAX(CAST(substr(code,4) AS INTEGER)) AS maxSeq FROM rides WHERE code GLOB 'CR-*'").get();
  return row?.maxSeq || 2841;
}
let nextRideSeq = currentRideSeq() + 1;

function rideCode() { return `CR-${nextRideSeq++}`; }

function rideView(id) {
  const r = db.prepare(`
    SELECT rides.*, u.name AS passenger_name,
           d.vehicle_code, d.rating AS driver_rating,
           du.name AS driver_name
    FROM rides
    JOIN users u ON u.id = rides.passenger_id
    LEFT JOIN drivers d ON d.id = rides.driver_id
    LEFT JOIN users du ON du.id = d.user_id
    WHERE rides.id = ?`).get(id);
  return r;
}

/**
 * Attach all real-time handlers. Rooms used:
 *   user:<id>      every socket joins its own user room
 *   drivers        all currently-online drivers (broadcast new requests)
 *   ride:<id>      passenger + assigned driver of a ride (status + location)
 */
export function attachSockets(io) {
  // Authenticate every socket from the JWT in the handshake.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const payload = token && verifyToken(token);
    if (!payload) return next(new Error('unauthorized'));
    socket.user = payload;
    next();
  });

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;
    socket.join(`user:${userId}`);

    // ---- Driver availability ------------------------------------------
    socket.on('driver:online', ({ lat, lng } = {}) => {
      if (role !== 'driver') return;
      const drv = db.prepare('SELECT id FROM drivers WHERE user_id = ?').get(userId);
      if (!drv) return;
      db.prepare('UPDATE drivers SET is_online = 1, lat = COALESCE(?,lat), lng = COALESCE(?,lng) WHERE id = ?')
        .run(lat ?? null, lng ?? null, drv.id);
      socket.join('drivers');
      audit(userId, 'driver_online');
      io.emit('drivers:count', onlineDriverCount());
    });

    socket.on('driver:offline', () => {
      if (role !== 'driver') return;
      const drv = db.prepare('SELECT id FROM drivers WHERE user_id = ?').get(userId);
      if (!drv) return;
      db.prepare('UPDATE drivers SET is_online = 0 WHERE id = ?').run(drv.id);
      socket.leave('drivers');
      audit(userId, 'driver_offline');
      io.emit('drivers:count', onlineDriverCount());
    });

    // ---- Live location stream (driver -> passenger) -------------------
    socket.on('driver:location', ({ rideId, lat, lng, speed }) => {
      if (role !== 'driver') return;
      const drv = db.prepare('SELECT id FROM drivers WHERE user_id = ?').get(userId);
      if (drv) db.prepare('UPDATE drivers SET lat = ?, lng = ? WHERE id = ?').run(lat, lng, drv.id);
      if (rideId) io.to(`ride:${rideId}`).emit('ride:location', { rideId, lat, lng, speed });
    });

    // ---- Passenger requests a ride ------------------------------------
    socket.on('ride:request', (payload, ack) => {
      if (role !== 'passenger') return ack?.({ error: 'only passengers can request' });
      const { pickup, drop, rideType = 'solo', scheduledFor = null } = payload || {};
      if (!pickup || !drop) return ack?.({ error: 'pickup and drop required' });

      const fare = estimateFare(pickup, drop, rideType);
      const p = coordsFor(pickup), d = coordsFor(drop);
      let info;
      while (true) {
        const code = rideCode();
        try {
          info = db.prepare(`
            INSERT INTO rides (code, passenger_id, pickup, drop_loc, pickup_lat, pickup_lng,
                               drop_lat, drop_lng, ride_type, fare, scheduled_for, status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
            code, userId, pickup, drop, p.lat, p.lng, d.lat, d.lng,
            rideType, fare, scheduledFor, 'requested');
          break;
        } catch (err) {
          if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE' && /rides.code/.test(err.message)) {
            continue;
          }
          throw err;
        }
      }

      const ride = rideView(info.lastInsertRowid);
      socket.join(`ride:${ride.id}`);
      audit(userId, 'ride_requested', { rideId: ride.id, scheduled: !!scheduledFor });

      // Scheduled rides are not dispatched immediately.
      if (!scheduledFor) io.to('drivers').emit('ride:new', ride);
      ack?.({ ride });
    });

    // ---- Driver accepts (atomic single-assignment) --------------------
    socket.on('ride:accept', ({ rideId }, ack) => {
      if (role !== 'driver') return ack?.({ error: 'only drivers can accept' });
      const drv = db.prepare('SELECT * FROM drivers WHERE user_id = ?').get(userId);
      if (!drv) return ack?.({ error: 'driver profile missing' });

      // Conditional UPDATE guarantees only ONE driver wins the ride.
      const claim = db.prepare(`
        UPDATE rides SET driver_id = ?, status = 'accepted', accepted_at = datetime('now')
        WHERE id = ? AND status = 'requested' AND driver_id IS NULL`).run(drv.id, rideId);

      if (claim.changes === 0) return ack?.({ error: 'ride already taken' });

      const ride = rideView(rideId);
      const eta = etaSeconds(drv.lat ? 'Main Gate' : ride.pickup, ride.pickup);
      audit(userId, 'ride_accepted', { rideId });

      io.to(`ride:${rideId}`).emit('ride:update', { ...ride, etaSeconds: eta });
      io.to('drivers').emit('ride:taken', { rideId });   // remove from other drivers' lists
      socket.join(`ride:${rideId}`);
      ack?.({ ride, etaSeconds: eta });
    });

    socket.on('ride:reject', ({ rideId }) => {
      if (role !== 'driver') return;
      audit(userId, 'ride_rejected', { rideId });
      // Rejection just removes it from this driver's view; ride stays open.
    });

    // ---- Status transitions: en_route -> arrived -> picked_up -> driving -> arrived_destination -> completed ------
    socket.on('ride:status', ({ rideId, status }, ack) => {
      console.log('ride:status received', rideId, status);
      const allowed = ['en_route', 'arrived', 'picked_up', 'driving', 'arrived_destination', 'in_progress', 'completed', 'cancelled'];
      if (!allowed.includes(status)) return ack?.({ error: 'bad status' });

      const stampCol = { arrived: null, picked_up: 'started_at',
                         completed: 'completed_at', cancelled: 'cancelled_at' }[status];
      const sql = stampCol
        ? `UPDATE rides SET status = ?, ${stampCol} = datetime('now') WHERE id = ?`
        : `UPDATE rides SET status = ? WHERE id = ?`;
try {
      const res = db.prepare(sql).run(status, rideId);
      console.log('ride:status update', status, res.changes, sql);

      if (res.changes === 0) return ack?.({ error: 'ride not updated' });

      if (status === 'completed') {
        const ride = db.prepare('SELECT driver_id FROM rides WHERE id = ?').get(rideId);
        if (ride?.driver_id)
          db.prepare('UPDATE drivers SET total_trips = total_trips + 1 WHERE id = ?').run(ride.driver_id);
      }
      const ride = rideView(rideId);
      audit(userId, `ride_${status}`, { rideId });
      io.to(`ride:${rideId}`).emit('ride:update', ride);
      ack?.({ ride });
    } catch (err) {
      console.error('ride:status failed', err);
      ack?.({ error: err.message || 'failed to update ride status' });
    }
    });

    socket.on('disconnect', () => {
      if (role === 'driver') {
        const drv = db.prepare('SELECT id FROM drivers WHERE user_id = ?').get(userId);
        if (drv) db.prepare('UPDATE drivers SET is_online = 0 WHERE id = ?').run(drv.id);
        io.emit('drivers:count', onlineDriverCount());
      }
    });
  });
}

function onlineDriverCount() {
  return db.prepare('SELECT COUNT(*) AS c FROM drivers WHERE is_online = 1').get().c;
}
