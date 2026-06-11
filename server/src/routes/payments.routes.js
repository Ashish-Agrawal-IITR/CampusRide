import { Router } from 'express';
import db, { audit } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

// POST /api/payments  { rideId, method }  -> simulated UPI/QR payment
router.post('/', requireAuth, (req, res) => {
  const { rideId, method = 'upi' } = req.body || {};
  if (!['upi', 'qr', 'cash'].includes(method))
    return res.status(400).json({ error: 'method must be upi, qr or cash' });

  const ride = db.prepare('SELECT * FROM rides WHERE id = ? AND passenger_id = ?')
    .get(rideId, req.user.id);
  if (!ride) return res.status(404).json({ error: 'ride not found' });

  const txnRef = `${method.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  db.prepare(`INSERT INTO payments (ride_id, method, amount, status, txn_ref)
              VALUES (?,?,?,?,?)`).run(rideId, method, ride.fare, 'success', txnRef);
  audit(req.user.id, 'payment', { rideId, method, amount: ride.fare });

  // A real integration would return a UPI deep link / QR string here.
  const upiUri = `upi://pay?pa=campusride@iitr&pn=CampusRide&am=${ride.fare}&tn=Ride%20${ride.code}&cu=INR`;
  res.status(201).json({ ok: true, txnRef, amount: ride.fare, method, upiUri });
});

// GET /api/payments/mine -> payment history
router.get('/mine', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, r.code, r.pickup, r.drop_loc FROM payments p
    JOIN rides r ON r.id = p.ride_id
    WHERE r.passenger_id = ? ORDER BY p.id DESC LIMIT 30`).all(req.user.id);
  res.json({ payments: rows });
});

export default router;
