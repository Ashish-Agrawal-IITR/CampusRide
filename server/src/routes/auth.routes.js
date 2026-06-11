import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db, { audit, tx } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, role = 'passenger', phone,
          vehicleCode, vehicleType, licenseNo } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email and password are required' });
  if (!['passenger', 'driver', 'admin'].includes(role))
    return res.status(400).json({ error: 'role must be passenger, driver or admin' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const run = () => {
    const u = db.prepare('INSERT INTO users (name,email,password_hash,role,phone) VALUES (?,?,?,?,?)')
      .run(name, email, hash, role, phone ?? null);
    if (role === 'driver') {
      db.prepare(`INSERT INTO drivers (user_id, vehicle_code, vehicle_type, license_no, verified)
                  VALUES (?,?,?,?,1)`)
        .run(u.lastInsertRowid, vehicleCode || `EV-${u.lastInsertRowid}`,
             vehicleType || 'e-rickshaw', licenseNo ?? null);
    }
    // Admin accounts are regular users with role='admin' and no driver record.
    return u.lastInsertRowid;
  };
  const id = tx(run);
  const user = db.prepare('SELECT id,name,email,role,phone FROM users WHERE id = ?').get(id);
  audit(id, 'register', { role });
  res.status(201).json({ token: signToken(user), user });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash))
    return res.status(401).json({ error: 'invalid credentials' });
  const safe = { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone };
  res.json({ token: signToken(safe), user: safe });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id,name,email,role,phone FROM users WHERE id = ?').get(req.user.id);
  let driver = null;
  if (user?.role === 'driver')
    driver = db.prepare('SELECT * FROM drivers WHERE user_id = ?').get(user.id);
  res.json({ user, driver });
});

export default router;
