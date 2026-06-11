import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

// GET /api/drivers/nearby -> online drivers (passenger Home "Nearby drivers")
router.get('/nearby', requireAuth, (_req, res) => {
  const rows = db.prepare(`
    SELECT d.id, d.vehicle_code, d.rating, d.lat, d.lng, u.name
    FROM drivers d JOIN users u ON u.id = d.user_id
    WHERE d.is_online = 1
    ORDER BY d.rating DESC LIMIT 8`).all();
  res.json({ drivers: rows });
});

// PATCH /api/drivers/availability  { online: true|false }
router.patch('/availability', requireAuth, requireRole('driver'), (req, res) => {
  const online = !!(req.body && req.body.online);
  db.prepare('UPDATE drivers SET is_online = ? WHERE user_id = ?').run(online ? 1 : 0, req.user.id);
  const drv = db.prepare('SELECT * FROM drivers WHERE user_id = ?').get(req.user.id);
  res.json({ driver: drv });
});

// GET /api/drivers/me/dashboard  -> driver stats card + earnings + ratings split
router.get('/me/dashboard', requireAuth, requireRole('driver'), (req, res) => {
  const drv = db.prepare('SELECT * FROM drivers WHERE user_id = ?').get(req.user.id);
  if (!drv) return res.status(404).json({ error: 'driver profile missing' });

  const today = db.prepare(`
    SELECT COUNT(*) AS rides, COALESCE(SUM(fare),0) AS earnings
    FROM rides WHERE driver_id = ? AND status = 'completed'
      AND date(completed_at) = date('now')`).get(drv.id);

  // Weekly earnings series (last 7 days)
  const weekly = db.prepare(`
    SELECT date(completed_at) AS d, COALESCE(SUM(fare),0) AS earnings
    FROM rides WHERE driver_id = ? AND status = 'completed'
      AND completed_at >= date('now','-6 days')
    GROUP BY date(completed_at) ORDER BY d`).all(drv.id);

  // Rating distribution
  const dist = db.prepare(`
    SELECT stars, COUNT(*) AS c FROM ratings WHERE driver_id = ? GROUP BY stars`).all(drv.id);
  const distribution = {};
  for (let s = 1; s <= 5; s++) distribution[s] = 0;
  dist.forEach(r => { distribution[r.stars] = r.c; });

  const recent = db.prepare(`
    SELECT rides.id, rides.fare, rides.pickup, rides.drop_loc, rides.completed_at,
           u.name AS passenger_name, rt.stars
    FROM rides JOIN users u ON u.id = rides.passenger_id
    LEFT JOIN ratings rt ON rt.ride_id = rides.id
    WHERE rides.driver_id = ? AND rides.status = 'completed'
    ORDER BY rides.id DESC LIMIT 6`).all(drv.id);

  res.json({ driver: drv, today, weekly, distribution, recent });
});

export default router;
