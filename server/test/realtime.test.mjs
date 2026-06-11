/**
 * End-to-end real-time integration test (hermetic — uses its own temp DB).
 *
 * Proves the core engineering requirements of PS-2:
 *   1. Passenger request is broadcast to online drivers (ride:new).
 *   2. A driver can accept and drive the full lifecycle (accepted -> completed).
 *   3. The passenger receives every status update in real time.
 *   4. SINGLE-DRIVER GUARANTEE: a second driver accepting the same ride is rejected.
 *
 * Run with:  npm test   (from the server/ directory)
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { io } from 'socket.io-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4099;
const API = `http://localhost:${PORT}`;
const DB = path.join(__dirname, 'test.db');
for (const f of [DB, DB + '-shm', DB + '-wal']) try { fs.unlinkSync(f); } catch {}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const post = async (p, body, token) => {
  const r = await fetch(`${API}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return r.json();
};

// Boot a dedicated server instance on an isolated DB.
const srv = spawn('node', ['--disable-warning=ExperimentalWarning', path.join(__dirname, '..', 'src', 'index.js')],
  { env: { ...process.env, PORT: String(PORT), DB_PATH: DB }, stdio: 'ignore' });

let failed = false;
const ok = (msg) => console.log(`  \u2713 ${msg}`);
function cleanup(code) {
  srv.kill();
  for (const f of [DB, DB + '-shm', DB + '-wal']) try { fs.unlinkSync(f); } catch {}
  process.exit(code);
}

try {
  // wait for health
  for (let i = 0; i < 30; i++) {
    try { const h = await (await fetch(`${API}/api/health`)).json(); if (h.ok) break; } catch {}
    await wait(200);
  }
  ok('server is up');

  // register a passenger and two drivers
  const pax = await post('/api/auth/register', { name: 'Test Pax', email: `pax${Date.now()}@t.ac.in`, password: 'pw', role: 'passenger' });
  const d1 = await post('/api/auth/register', { name: 'Driver One', email: `d1${Date.now()}@t.ac.in`, password: 'pw', role: 'driver', vehicleCode: `EV-T1${Date.now() % 1000}` });
  const d2 = await post('/api/auth/register', { name: 'Driver Two', email: `d2${Date.now()}@t.ac.in`, password: 'pw', role: 'driver', vehicleCode: `EV-T2${Date.now() % 1000}` });
  assert.ok(pax.token && d1.token && d2.token, 'all three registered with tokens');
  ok('registered passenger + 2 drivers (JWT issued)');

  const sPax = io(API, { auth: { token: pax.token } });
  const sD1 = io(API, { auth: { token: d1.token } });
  const sD2 = io(API, { auth: { token: d2.token } });
  await wait(400);
  assert.ok(sPax.connected && sD1.connected && sD2.connected, 'sockets authenticated & connected');
  ok('three sockets authenticated via JWT handshake');

  const updates = [];
  sPax.on('ride:update', (r) => updates.push(r.status));
  let gotNew = false;
  sD1.on('ride:new', () => { gotNew = true; });

  // driver 1 goes online
  sD1.emit('driver:online', { lat: 29.8642, lng: 77.8930 });
  await wait(300);

  // passenger requests
  const { ride } = await new Promise((res) => sPax.emit('ride:request', { pickup: 'Main Gate', drop: 'LHC', rideType: 'solo' }, res));
  assert.match(ride.code, /^CR-\d+$/, 'ride got a CR-#### code');
  await wait(400);
  assert.ok(gotNew, 'online driver received ride:new broadcast');
  ok(`request broadcast to drivers (ride ${ride.code})`);

  // driver 1 accepts
  const acc = await new Promise((res) => sD1.emit('ride:accept', { rideId: ride.id }, res));
  assert.ok(!acc.error && acc.ride, 'driver 1 accepted successfully');
  ok('driver 1 accepted (atomic claim succeeded)');

  // lifecycle
  for (const st of ['arrived', 'in_progress', 'completed']) {
    await new Promise((res) => sD1.emit('ride:status', { rideId: ride.id, status: st }, res));
    await wait(200);
  }
  for (const st of ['accepted', 'arrived', 'in_progress', 'completed'])
    assert.ok(updates.includes(st), `passenger received "${st}" update`);
  ok('passenger received full lifecycle: accepted -> arrived -> in_progress -> completed');

  // SINGLE-DRIVER GUARANTEE
  const second = await new Promise((res) => sD2.emit('ride:accept', { rideId: ride.id }, res));
  assert.equal(second.error, 'ride already taken', 'second driver is rejected');
  ok('SINGLE-DRIVER GUARANTEE: second driver rejected with "ride already taken"');

  sPax.close(); sD1.close(); sD2.close();
  console.log('\n  ALL TESTS PASSED \u2713\n');
} catch (err) {
  failed = true;
  console.error('\n  TEST FAILED \u2717\n ', err.message, '\n');
}
cleanup(failed ? 1 : 0);
