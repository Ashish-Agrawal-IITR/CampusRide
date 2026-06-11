# CampusRide — Demo Video Script (≤ 3 minutes)

A scene-by-scene plan for the submission video. Target length **2:45**. Record at 1080p,
two browser windows side by side for the real-time segment. Speak to the timestamps below.

**Before you record:** `npm run install:all && npm run seed && npm run dev`, then open two
browser windows at `http://localhost:5173`. Have the login screen ready in both.

---

### 0:00 – 0:20 · Hook + landing (Home)
- Open on the **Home** page. "CampusRide is a real-time ride platform for IIT Roorkee —
  connecting students with verified e-rickshaw drivers."
- Point to the live booking card, the Solo/Share/Cargo fare tabs, and the KPI strip
  (rides today, active drivers, avg wait, CO₂ saved).
- Mention the stack in one line: "React + Vite front end, an Express + Socket.IO back end,
  and a built-in SQLite database — so it runs anywhere with just Node."

### 0:20 – 0:35 · Auth
- Show the **login screen** with the one-tap Passenger / Driver / Admin demo buttons.
- "Passengers and drivers each have JWT-secured accounts; drivers register with a vehicle."
- Click **Driver** in window A, **Passenger** in window B.

### 0:35 – 1:25 · The core: real-time dispatch (BOTH windows)
This is the centrepiece — keep both windows visible.
1. **Window A (Driver):** flip the **Online** toggle. "Drivers control their
   availability; going online joins the live dispatch pool."
2. **Window B (Passenger / Aarav):** go to **Home**, pick Pickup/Drop, hit **Confirm ride**.
3. **Window A:** the request **appears instantly** under *Incoming requests* — "no refresh,
   pushed over a WebSocket." Click **Accept**.
4. **Window B:** the app jumps to **Tracking** — show the **live map** (Leaflet/OpenStreetMap)
   with the driver marker moving and the **ride-status timeline** advancing.
5. **Window A:** advance status (arrived → on trip → completed) and narrate that each step
   is pushed live to the passenger.
- One-liner on correctness: "Acceptance is atomic — if two drivers tap Accept, only the first
  wins; the other gets *ride already taken*. There's an automated test that proves it."

### 1:25 – 1:55 · Passenger features
- On **Passenger**: show the active-ride card, **Nearby drivers**, ride history, and the
  **Rate your ride** flow (stars + tags → Submit). "Ratings recompute the driver's average."
- Mention **digital payments**: a completed ride generates a UPI/QR payment with a `upi://`
  deep link (bonus feature).

### 1:55 – 2:25 · Driver dashboard
- On **Driver**: earnings, today's rides, rating, the weekly-earnings sparkline, and the
  **passenger-ratings distribution** with quick feedback chips.

### 2:25 – 2:45 · Admin / analytics + close
- On **Admin**: the live KPIs, the **peak-hour demand** curve, the **driver-utilization donut**,
  the **demand heatmap** by zone, and the **14-day ML forecast** (actual vs forecast).
- "The forecast is a transparent trend + weekly-seasonality + EWMA model over 60 days of data."
- Close: "All seven mandatory features and all six bonus items — real-time, tested, and
  reproducible. Thanks for watching."

---

### Talking-point cheat sheet
- **Single-driver guarantee** → conditional `UPDATE ... WHERE status='requested' AND driver_id IS NULL`.
- **Rooms** → `ride:<id>` (participants), `drivers` (broadcast), `user:<id>` (private).
- **Reproducible** → `node:sqlite`, no compiler / DB server; `npm test` proves the core.
- **Bonus** → live map, scheduling, UPI payments, analytics, ML forecast, advanced dashboard.
