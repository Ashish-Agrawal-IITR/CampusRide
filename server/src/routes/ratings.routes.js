import { Router } from 'express';
import db, { audit, tx } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

// POST /api/ratings  { rideId, stars, tags?, comment? }
router.post('/', requireAuth, requireRole('passenger'), (req, res) => {
  const { rideId, stars, tags = [], comment = '' } = req.body || {};
  if (!rideId || !stars) return res.status(400).json({ error: 'rideId and stars required' });

  const ride = db.prepare('SELECT * FROM rides WHERE id = ? AND passenger_id = ?')
    .get(rideId, req.user.id);
  if (!ride) return res.status(404).json({ error: 'ride not found' });
  if (ride.status !== 'completed') return res.status(400).json({ error: 'ride not completed' });
  if (!ride.driver_id) return res.status(400).json({ error: 'ride had no driver' });

  const run = () => {
    db.prepare(`INSERT INTO ratings (ride_id, passenger_id, driver_id, stars, tags, comment)
                VALUES (?,?,?,?,?,?)
                ON CONFLICT(ride_id) DO UPDATE SET stars=excluded.stars,
                  tags=excluded.tags, comment=excluded.comment`)
      .run(rideId, req.user.id, ride.driver_id, stars, JSON.stringify(tags), comment);

    // Recompute the driver's average rating.
    const agg = db.prepare('SELECT AVG(stars) AS avg FROM ratings WHERE driver_id = ?')
      .get(ride.driver_id);
    db.prepare('UPDATE drivers SET rating = ROUND(?,2) WHERE id = ?')
      .run(agg.avg, ride.driver_id);
  };
  tx(run);
  audit(req.user.id, 'rating_submitted', { rideId, stars });
  res.status(201).json({ ok: true });
});

// GET /api/ratings/driver/:id  -> feedback feed + summary
router.get('/driver/:id', requireAuth, (req, res) => {
  const driverId = req.params.id;
  const summary = db.prepare(`
    SELECT COUNT(*) AS total, ROUND(AVG(stars),2) AS avg
    FROM ratings WHERE driver_id = ?`).get(driverId);
  const feed = db.prepare(`
    SELECT stars, tags, comment, created_at FROM ratings
    WHERE driver_id = ? AND (comment != '' OR tags != '[]')
    ORDER BY id DESC LIMIT 10`).all(driverId);
  res.json({ summary, feed });
});

export default router;
