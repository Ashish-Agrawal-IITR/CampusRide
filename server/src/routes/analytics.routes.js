import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { forecastDemand } from '../forecast.js';
import { ZONE_NAMES } from '../campus.js';

const router = Router();

// GET /api/analytics/overview  -> top KPI cards
router.get('/overview', requireAuth, requireRole('admin'), (_req, res) => {
  const activeRides = db.prepare(
    `SELECT COUNT(*) AS c FROM rides WHERE status IN ('accepted','en_route','arrived','picked_up','driving','arrived_destination','in_progress')`).get().c;
  const onlineDrivers = db.prepare('SELECT COUNT(*) AS c FROM drivers WHERE is_online = 1').get().c;
  const totalDrivers = db.prepare('SELECT COUNT(*) AS c FROM drivers').get().c;
  const ridersToday = db.prepare(
    `SELECT COUNT(DISTINCT passenger_id) AS c FROM rides WHERE date(requested_at) = date('now')`).get().c;
  const completedToday = db.prepare(
    `SELECT COUNT(*) AS c FROM rides WHERE status='completed' AND date(completed_at)=date('now')`).get().c;
  const utilization = totalDrivers ? Math.round((onlineDrivers / totalDrivers) * 100) : 0;
  res.json({
    activeRides, onlineDrivers, totalDrivers, ridersToday, completedToday,
    utilization, avgWaitMin: 2.4,
  });
});

// GET /api/analytics/peak-hours -> rides per hour, last 24h
router.get('/peak-hours', requireAuth, requireRole('admin'), (_req, res) => {
  const rows = db.prepare(`
    SELECT CAST(strftime('%H', requested_at) AS INTEGER) AS hour, COUNT(*) AS rides
    FROM rides WHERE requested_at >= datetime('now','-1 day')
    GROUP BY hour`).all();
  const map = Object.fromEntries(rows.map(r => [r.hour, r.rides]));
  const series = Array.from({ length: 24 }, (_, h) => ({ hour: h, rides: map[h] || 0 }));
  const peak = series.reduce((a, b) => (b.rides > a.rides ? b : a), series[0]);
  res.json({ series, peak });
});

// GET /api/analytics/heatmap -> pickups per zone today (demand heatmap)
router.get('/heatmap', requireAuth, requireRole('admin'), (_req, res) => {
  const rows = db.prepare(`
    SELECT pickup AS zone, COUNT(*) AS pickups FROM rides
    WHERE date(requested_at) = date('now') GROUP BY pickup`).all();
  const map = Object.fromEntries(rows.map(r => [r.zone, r.pickups]));
  const zones = ZONE_NAMES.map(z => ({ zone: z, pickups: map[z] || 0 }))
    .sort((a, b) => b.pickups - a.pickups);
  const hottest = zones[0];
  res.json({ zones, hottest });
});

// GET /api/analytics/revenue -> revenue last 7 days
router.get('/revenue', requireAuth, requireRole('admin'), (_req, res) => {
  const rows = db.prepare(`
    SELECT date(completed_at) AS d, COALESCE(SUM(fare),0) AS revenue, COUNT(*) AS rides
    FROM rides WHERE status='completed' AND completed_at >= date('now','-6 days')
    GROUP BY date(completed_at) ORDER BY d`).all();
  res.json({ series: rows });
});

// GET /api/analytics/forecast -> 14-day demand forecast (ML bonus)
router.get('/forecast', requireAuth, requireRole('admin'), (_req, res) => {
  const daily = db.prepare(`
    SELECT date(requested_at) AS date,
           COUNT(*) AS count,
           CAST(strftime('%w', requested_at) AS INTEGER) AS dow
    FROM rides
    WHERE requested_at >= date('now','-60 days')
    GROUP BY date(requested_at) ORDER BY date`).all();
  res.json(forecastDemand(daily, 14));
});

export default router;
