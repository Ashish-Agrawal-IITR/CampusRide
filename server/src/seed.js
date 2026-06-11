import bcrypt from 'bcryptjs';
import db, { tx } from './db.js';
import { ZONE_NAMES, coordsFor, estimateFare } from './campus.js';

const PW = bcrypt.hashSync('password123', 10);

console.log('Seeding CampusRide database...');

const wipe = () => {
  db.exec(`DELETE FROM ratings; DELETE FROM payments; DELETE FROM rides;
           DELETE FROM drivers; DELETE FROM users; DELETE FROM audit_logs;
           DELETE FROM sqlite_sequence;`);
};
tx(wipe);

// ---- Users ---------------------------------------------------------------
const insUser = db.prepare('INSERT INTO users (name,email,password_hash,role,phone) VALUES (?,?,?,?,?)');
const insDriver = db.prepare(`INSERT INTO drivers
  (user_id,vehicle_code,vehicle_type,license_no,verified,is_online,lat,lng,rating,total_trips)
  VALUES (?,?,?,?,1,?,?,?,?,?)`);

insUser.run('Campus Admin', 'admin@iitr.ac.in', PW, 'admin', '9000000000');

const driverSpecs = [
  ['Driver User',  'driver@iitr.ac.in',  'EV-04', 4.92, 1240, 1, 'Main Gate'],
  ['Sunil P.',    'sunil@iitr.ac.in', 'EV-11', 4.88, 980,  1, 'LHC'],
  ['Aman S.',     'aman@iitr.ac.in',  'EV-22', 4.95, 1530, 1, 'Library'],
  ['Vikas T.',    'vikas@iitr.ac.in', 'EV-07', 4.81, 760,  1, 'MAC'],
  ['Mohit J.',    'mohit@iitr.ac.in', 'EV-09', 4.79, 640,  0, 'Bhawan Cluster'],
  ['Ramesh K.',   'ramesh@iitr.ac.in','EV-15', 4.90, 1100, 1, 'Convocation'],
];
const driverIds = {};
for (const [name, email, code, rating, trips, online, zone] of driverSpecs) {
  const u = insUser.run(name, email, PW, 'driver', '98' + Math.floor(10000000 + Math.random() * 89999999));
  const c = coordsFor(zone);
  const d = insDriver.run(u.lastInsertRowid, code, 'e-rickshaw', code + '-LIC', online, c.lat, c.lng, rating, trips);
  driverIds[code] = d.lastInsertRowid;
}

const paxSpecs = [
  ['Aarav M.', 'aarav@iitr.ac.in'], ['Priya S.', 'priya@iitr.ac.in'],
  ['Kavya R.', 'kavya@iitr.ac.in'], ['Rohan T.', 'rohan@iitr.ac.in'],
  ['Sneha B.', 'sneha@iitr.ac.in'], ['Ishaan G.', 'ishaan@iitr.ac.in'],
  ['Neha V.',  'neha@iitr.ac.in'],  ['Karan D.', 'karan@iitr.ac.in'],
];
const paxIds = [];
for (const [name, email] of paxSpecs) {
  const u = insUser.run(name, email, PW, 'passenger', '97' + Math.floor(10000000 + Math.random() * 89999999));
  paxIds.push(u.lastInsertRowid);
}

// ---- Historical rides (60 days) for forecasting / revenue / heatmap ------
const allDriverIds = Object.values(driverIds);
const insRide = db.prepare(`INSERT INTO rides
  (code,passenger_id,driver_id,pickup,drop_loc,pickup_lat,pickup_lng,drop_lat,drop_lng,
   ride_type,status,fare,requested_at,accepted_at,started_at,completed_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insRating = db.prepare(`INSERT INTO ratings (ride_id,passenger_id,driver_id,stars,tags,comment)
  VALUES (?,?,?,?,?,?)`);

let seq = 100000;  // history range, kept clear of the visible CR-28xx live series
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
const tags = ['Polite', 'Clean ride', 'Fast', 'On time'];

const seedHistory = () => {
  for (let dayOffset = 60; dayOffset >= 1; dayOffset--) {
    // Weekly seasonality: weekends busier (Fri/Sat peak), plus mild upward trend.
    const date = new Date(); date.setDate(date.getDate() - dayOffset);
    const dow = date.getDay();
    const weekendBoost = [0.9, 0.85, 0.9, 0.95, 1.15, 1.35, 1.1][dow];
    const trend = 1 + (60 - dayOffset) * 0.004;
    const count = Math.round((28 + Math.random() * 8) * weekendBoost * trend);

    for (let i = 0; i < count; i++) {
      const pickup = rnd(ZONE_NAMES), drop = rnd(ZONE_NAMES.filter(z => z !== pickup));
      const type = Math.random() < 0.55 ? 'solo' : (Math.random() < 0.7 ? 'share' : 'cargo');
      const fare = estimateFare(pickup, drop, type);
      const hour = Math.random() < 0.5
        ? rnd([8, 9, 9, 10, 17, 18, 18, 19])             // peaks ~9am & ~6pm
        : Math.floor(Math.random() * 24);
      const ts = new Date(date); ts.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      const iso = ts.toISOString().slice(0, 19).replace('T', ' ');
      const p = coordsFor(pickup), dr = coordsFor(drop);
      const driverId = rnd(allDriverIds), paxId = rnd(paxIds);
      const r = insRide.run(`CR-${seq++}`, paxId, driverId, pickup, drop,
        p.lat, p.lng, dr.lat, dr.lng, type, 'completed', fare, iso, iso, iso, iso);
      if (Math.random() < 0.6) {
        const stars = Math.random() < 0.9 ? 5 : 4;
        const t = Math.random() < 0.5 ? [rnd(tags)] : [];
        insRating.run(r.lastInsertRowid, paxId, driverId, stars, JSON.stringify(t),
          Math.random() < 0.15 ? rnd(['Smooth ride', 'Always on time', 'Polite & helpful', '']) : '');
      }
    }
  }
};
tx(seedHistory);

// ---- Today's live + recent rides (matches the admin "Active rides" board) -
const today = new Date().toISOString().slice(0, 10);
const liveSpecs = [
  ['CR-2841', 'Driver User',  'EV-04', 'Bhawan Cluster', 'LHC',   'in_progress', 15],
  ['CR-2840', 'Sunil P.',    'EV-11', 'Main Gate',  'MAC',         'arrived',     22],
  ['CR-2839', 'Aman S.',     'EV-22', 'Library',    'PI Hostel',   'in_progress', 18],
  ['CR-2838', 'Vikas T.',    'EV-07', 'Cautley Bhawan', 'Tinkering Lab', 'accepted', 14],
  ['CR-2837', 'Mohit J.',    'EV-09', 'Govind Bhawan',  'Convocation',   'in_progress', 28],
];
for (let i = 0; i < liveSpecs.length; i++) {
  const [code, , vcode, pickup, drop, status, fare] = liveSpecs[i];
  const p = coordsFor(pickup), dr = coordsFor(drop);
  insRide.run(code, rnd(paxIds), driverIds[vcode], pickup, drop,
    p.lat, p.lng, dr.lat, dr.lng, 'solo', status, fare,
    `${today} 10:3${i}:00`, `${today} 10:3${i}:00`, `${today} 10:3${i}:30`, null);
}

// A few completed rides today so KPIs/heatmap have today's data.
for (let i = 0; i < 40; i++) {
  const pickup = rnd(ZONE_NAMES), drop = rnd(ZONE_NAMES.filter(z => z !== pickup));
  const fare = estimateFare(pickup, drop, 'solo');
  const p = coordsFor(pickup), dr = coordsFor(drop);
  const hh = String(8 + Math.floor(Math.random() * 3)).padStart(2, '0');
  insRide.run(`CR-${seq++}`, rnd(paxIds), rnd(allDriverIds), pickup, drop,
    p.lat, p.lng, dr.lat, dr.lng, 'solo', 'completed', fare,
    `${today} ${hh}:00:00`, `${today} ${hh}:01:00`, `${today} ${hh}:02:00`, `${today} ${hh}:15:00`);
}

const counts = {
  users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
  drivers: db.prepare('SELECT COUNT(*) c FROM drivers').get().c,
  rides: db.prepare('SELECT COUNT(*) c FROM rides').get().c,
  ratings: db.prepare('SELECT COUNT(*) c FROM ratings').get().c,
};
console.log('Seed complete:', counts);
console.log('\nDemo logins (password: password123):');
console.log('  Passenger: aarav@iitr.ac.in');
console.log('  Driver:    driver@iitr.ac.in');
console.log('  Admin:     admin@iitr.ac.in\n');
