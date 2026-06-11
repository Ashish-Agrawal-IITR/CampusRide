import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { estimateFare, etaSeconds, ZONE_NAMES } from '../campus.js';

const router = Router();

// GET /api/rides/zones  -> list of bookable campus locations
router.get('/zones', (_req, res) => res.json({ zones: ZONE_NAMES }));

// GET /api/rides/quote?pickup=&drop=&type=  -> fare + eta preview (Home page)
router.get('/quote', (req, res) => {
  const { pickup, drop, type = 'solo' } = req.query;
  if (!pickup || !drop) return res.status(400).json({ error: 'pickup and drop required' });
  res.json({
    fare: estimateFare(pickup, drop, type),
    etaSeconds: etaSeconds(pickup, drop),
    quotes: {
      solo: estimateFare(pickup, drop, 'solo'),
      share: estimateFare(pickup, drop, 'share'),
      cargo: estimateFare(pickup, drop, 'cargo'),
    },
  });
});

// GET /api/rides/active  -> live rides (admin board)
router.get('/active', requireAuth, (_req, res) => {
  const rows = db.prepare(`
    SELECT rides.id, rides.code, rides.pickup, rides.drop_loc, rides.status, rides.fare,
           du.name AS driver_name, d.vehicle_code
    FROM rides
    LEFT JOIN drivers d ON d.id = rides.driver_id
    LEFT JOIN users du ON du.id = d.user_id
    WHERE rides.status IN ('accepted','en_route','arrived','picked_up','driving','arrived_destination','in_progress')
    ORDER BY rides.id DESC LIMIT 20`).all();
  res.json({ rides: rows });
});

// GET /api/rides/mine  -> ride history for current user (passenger or driver)
router.get('/mine', requireAuth, (req, res) => {
  const { id, role } = req.user;
  const rows = role === 'driver'
    ? db.prepare(`SELECT rides.*, u.name AS passenger_name
                  FROM rides JOIN drivers d ON d.id = rides.driver_id
                  JOIN users u ON u.id = rides.passenger_id
                  WHERE d.user_id = ? ORDER BY rides.id DESC LIMIT 50`).all(id)
    : db.prepare(`SELECT rides.*, du.name AS driver_name, d.vehicle_code
                  FROM rides
                  LEFT JOIN drivers d ON d.id = rides.driver_id
                  LEFT JOIN users du ON du.id = d.user_id
                  WHERE rides.passenger_id = ? ORDER BY rides.id DESC LIMIT 50`).all(id);
  res.json({ rides: rows });
});

// GET /api/rides/open  -> open requests for drivers
router.get('/open', requireAuth, (_req, res) => {
  const rows = db.prepare(`
    SELECT rides.*, u.name AS passenger_name
    FROM rides JOIN users u ON u.id = rides.passenger_id
    WHERE status = 'requested' AND driver_id IS NULL AND scheduled_for IS NULL
    ORDER BY rides.id ASC`).all();
  res.json({ rides: rows });
});

// GET /api/rides/scheduled -> upcoming scheduled rides for current passenger
router.get('/scheduled', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM rides
    WHERE passenger_id = ? AND scheduled_for IS NOT NULL AND status = 'requested'
    ORDER BY scheduled_for ASC`).all(req.user.id);
  res.json({ rides: rows });
});

// GET /api/rides/:id
router.get('/:id', requireAuth, (req, res) => {
  const ride = db.prepare(`
    SELECT rides.*, u.name AS passenger_name, du.name AS driver_name,
           d.vehicle_code, d.rating AS driver_rating, d.lat AS driver_lat, d.lng AS driver_lng
    FROM rides
    JOIN users u ON u.id = rides.passenger_id
    LEFT JOIN drivers d ON d.id = rides.driver_id
    LEFT JOIN users du ON du.id = d.user_id
    WHERE rides.id = ?`).get(req.params.id);
  if (!ride) return res.status(404).json({ error: 'not found' });
  res.json({ ride });
});

export default router;
