import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'campusride.db');

const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK (role IN ('passenger','driver','admin')),
  phone         TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drivers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle_code TEXT    NOT NULL UNIQUE,
  vehicle_type TEXT    NOT NULL DEFAULT 'e-rickshaw',
  license_no   TEXT,
  verified     INTEGER NOT NULL DEFAULT 1,
  is_online    INTEGER NOT NULL DEFAULT 0,
  lat          REAL,
  lng          REAL,
  rating       REAL    NOT NULL DEFAULT 5.0,
  total_trips  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rides (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT    NOT NULL UNIQUE,
  passenger_id  INTEGER NOT NULL REFERENCES users(id),
  driver_id     INTEGER REFERENCES drivers(id),
  pickup        TEXT    NOT NULL,
  drop_loc      TEXT    NOT NULL,
  pickup_lat    REAL, pickup_lng REAL,
  drop_lat      REAL, drop_lng REAL,
  ride_type     TEXT    NOT NULL DEFAULT 'solo' CHECK (ride_type IN ('solo','share','cargo')),
  status        TEXT    NOT NULL DEFAULT 'requested'
                CHECK (status IN ('requested','accepted','en_route','arrived','picked_up','driving','arrived_destination','in_progress','completed','cancelled')),
  fare          INTEGER NOT NULL DEFAULT 0,
  scheduled_for TEXT,
  requested_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  accepted_at   TEXT, started_at TEXT, completed_at TEXT, cancelled_at TEXT
);

CREATE TABLE IF NOT EXISTS ratings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ride_id      INTEGER NOT NULL UNIQUE REFERENCES rides(id),
  passenger_id INTEGER NOT NULL REFERENCES users(id),
  driver_id    INTEGER NOT NULL REFERENCES drivers(id),
  stars        INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  tags         TEXT,
  comment      TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ride_id    INTEGER NOT NULL REFERENCES rides(id),
  method     TEXT    NOT NULL CHECK (method IN ('upi','qr','cash')),
  amount     INTEGER NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'success' CHECK (status IN ('pending','success','failed')),
  txn_ref    TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id   INTEGER,
  action     TEXT NOT NULL,
  meta       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rides_status  ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_pax      ON rides(passenger_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver   ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online);
`);

const rideSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='rides'").get()?.sql;
if (rideSchema && !rideSchema.includes("'arrived_destination'")) {
  console.log('Migrating rides.status constraint to support the new lifecycle...');
  db.exec('BEGIN');
  db.exec('ALTER TABLE rides RENAME TO rides_old');
  db.exec(`CREATE TABLE rides (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    code          TEXT    NOT NULL UNIQUE,
    passenger_id  INTEGER NOT NULL REFERENCES users(id),
    driver_id     INTEGER REFERENCES drivers(id),
    pickup        TEXT    NOT NULL,
    drop_loc      TEXT    NOT NULL,
    pickup_lat    REAL, pickup_lng REAL,
    drop_lat      REAL, drop_lng REAL,
    ride_type     TEXT    NOT NULL DEFAULT 'solo' CHECK (ride_type IN ('solo','share','cargo')),
    status        TEXT    NOT NULL DEFAULT 'requested'
                  CHECK (status IN ('requested','accepted','en_route','arrived','picked_up','driving','arrived_destination','in_progress','completed','cancelled')),
    fare          INTEGER NOT NULL DEFAULT 0,
    scheduled_for TEXT,
    requested_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    accepted_at   TEXT, started_at TEXT, completed_at TEXT, cancelled_at TEXT
  );`);
  db.exec(`INSERT INTO rides (id,code,passenger_id,driver_id,pickup,drop_loc,pickup_lat,pickup_lng,drop_lat,drop_lng,ride_type,status,fare,scheduled_for,requested_at,accepted_at,started_at,completed_at,cancelled_at)
           SELECT id,code,passenger_id,driver_id,pickup,drop_loc,pickup_lat,pickup_lng,drop_lat,drop_lng,ride_type,status,fare,scheduled_for,requested_at,accepted_at,started_at,completed_at,cancelled_at
           FROM rides_old`);
  db.exec('DROP TABLE rides_old');
  db.exec('CREATE INDEX IF NOT EXISTS idx_rides_status  ON rides(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_rides_pax      ON rides(passenger_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_rides_driver   ON rides(driver_id)');
  db.exec('COMMIT');
}

// node:sqlite has no db.transaction() helper, so provide a small wrapper.
export function tx(fn) {
  db.exec('BEGIN');
  try { const out = fn(); db.exec('COMMIT'); return out; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

export function audit(actorId, action, meta = {}) {
  db.prepare('INSERT INTO audit_logs (actor_id, action, meta) VALUES (?,?,?)')
    .run(actorId ?? null, action, JSON.stringify(meta));
}

export default db;
