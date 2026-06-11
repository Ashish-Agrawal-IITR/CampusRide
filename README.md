# CampusRide — Real-Time Campus Mobility & Ride Management Platform

> **Cult Open Projects 2026 · Problem Statement 2** · IIT Roorkee
> A campus-scale ride-hailing platform connecting students with verified e-rickshaw drivers — built around a real WebSocket dispatch engine.

CampusRide lets passengers request rides, drivers go online and accept requests, and everyone watch the ride progress **live** — with an analytics/operations dashboard for administrators, an interactive campus map, simulated UPI payments, ride scheduling, and an ML demand forecast.

---

## ✨ Feature coverage

### Mandatory features
| # | Requirement | Where |
|---|-------------|-------|
| A | **Auth & profiles** (passenger + driver accounts, JWT, vehicle info, verification) | `server/src/routes/auth.routes.js`, `client/src/pages/Login.jsx` |
| B | **Driver availability** (online / offline, visible to passengers) | Driver page toggle → `driver:online/offline` socket events |
| C | **Ride request workflow** (request, accept, reject, single-driver guarantee) | `server/src/socket.js` (`ride:request`, `ride:accept`) |
| D | **Real-time updates via WebSockets (Socket.IO)** — the core engineering component | `server/src/socket.js`, `client/src/socket.js` |
| E | **Ride lifecycle state machine** (`requested → accepted → arrived → in_progress → completed / cancelled`) | `rides.status` CHECK constraint + `ride:status` events |
| F | **Driver dashboard** (earnings, rides, rating, history, stats) | `client/src/pages/Driver.jsx`, `/api/drivers/me/dashboard` |
| G | **Ratings & feedback** (stars + tags, average recompute, feedback feed) | `client/src/pages/Passenger.jsx`, `server/src/routes/ratings.routes.js` |

### Bonus features (all six)
| Bonus | Implementation |
|-------|----------------|
| **Live map integration** | Leaflet + OpenStreetMap on the Tracking page with an animated driver marker, route polyline, and live `ride:location` socket stream |
| **Ride scheduling** | `scheduled_for` column + `/api/rides/scheduled`; scheduled rides are held out of immediate dispatch |
| **Digital payments** | Simulated UPI / QR payments with a generated `upi://` deep link — `server/src/routes/payments.routes.js` |
| **Demand analytics** | Peak-hour curve, per-zone demand heatmap, revenue trend — `/api/analytics/*` |
| **Demand forecasting (ML)** | 14-day forecast via trend + weekly-seasonality decomposition + EWMA — `server/src/forecast.js` |
| **Advanced dashboard** | Live operations dashboard: KPIs, utilization donut, auto-refreshing active-rides board, forecast band |

---

## 🧱 Technology stack

**Frontend** — React 18 · Vite · Tailwind CSS · React Router · Recharts · React-Leaflet · socket.io-client
**Backend** — Node.js 22 · Express · Socket.IO · JWT (`jsonwebtoken`) · `bcryptjs`
**Database** — SQLite via the built-in **`node:sqlite`** module (zero native compilation; no DB server to install)

> Using Node's built-in SQLite keeps the project fully reproducible — a grader only needs **Node ≥ 22.5**, no compiler, no Postgres/Mongo, no `node-gyp`.

---

## 🚀 Quick start

```bash
# 1. Install everything (root, server, client)
npm install                 # installs concurrently
npm run install:all         # installs server + client deps

# 2. Seed the demo database (15 users, 6 drivers, ~2,250 rides incl. 60 days of history)
npm run seed

# 3. Run both server (:4000) and client (:5173) together
npm run dev
```

Open **http://localhost:5173**.

### Demo logins (password: `password123`)
| Role | Email | One-tap |
|------|-------|---------|
| Passenger | `aarav@iitr.ac.in` | "Passenger" button on the login screen |
| Driver | `driver@iitr.ac.in` | "Driver" button |
| Admin | `admin@iitr.ac.in` | "Admin" button |

### Try the real-time flow
1. Open two browser windows. Log in as **Driver** in one — toggle **Online**.
2. Log in as **Passenger** (Aarav) in the other — book a ride from **Home**.
3. The request appears instantly on the driver's screen → click **Accept**.
4. The passenger is taken to **Tracking**, watching status + the driver marker update live.
5. Open **Admin** to see the active ride and KPIs update in real time.

---

## ✅ Automated test

A hermetic integration test (its own temp DB, no seed needed) boots the server and proves the
core engineering requirements over real sockets:

```bash
npm --prefix server test
```

It asserts: JWT-authenticated sockets, request broadcast to drivers, atomic accept, the full
`accepted → arrived → in_progress → completed` lifecycle pushed to the passenger, and the
**single-driver guarantee** (a second driver accepting the same ride is rejected).

---

## 📤 Publish to GitHub

```bash
git init && git add . && git commit -m "CampusRide — PS2 submission"
git branch -M main
git remote add origin https://github.com/<you>/campusride.git
git push -u origin main
```

`node_modules`, `dist`, `*.db` and `.env` are already excluded via `.gitignore`.

---

## 🐳 Docker (optional)

```bash
docker compose up --build
# client → http://localhost:5173   server → http://localhost:4000
```

---

## 📡 API overview

```
POST   /api/auth/register            create passenger/driver account
POST   /api/auth/login               JWT login
GET    /api/auth/me                  current user (+ driver profile)

GET    /api/rides/zones              bookable campus locations
GET    /api/rides/quote              fare + ETA preview (solo/share/cargo)
GET    /api/rides/open               open requests (drivers)
GET    /api/rides/active             live rides (admin board)
GET    /api/rides/mine               ride history (role-aware)
GET    /api/rides/scheduled          upcoming scheduled rides
GET    /api/rides/:id                ride detail

GET    /api/drivers/nearby           online drivers
PATCH  /api/drivers/availability     set online/offline
GET    /api/drivers/me/dashboard     driver KPIs, earnings, ratings split

POST   /api/ratings                  submit rating (recomputes driver avg)
GET    /api/ratings/driver/:id       feedback feed + summary

POST   /api/payments                 simulated UPI/QR payment (+ upi:// link)
GET    /api/payments/mine            payment history

GET    /api/analytics/overview       KPI cards
GET    /api/analytics/peak-hours     rides/hour, last 24h
GET    /api/analytics/heatmap        pickups per zone
GET    /api/analytics/revenue        revenue, last 7 days
GET    /api/analytics/forecast       14-day demand forecast (ML)
```

### Socket.IO events
| Event | Direction | Purpose |
|-------|-----------|---------|
| `driver:online` / `driver:offline` | client → server | availability |
| `driver:location` | driver → server → `ride:location` | live GPS stream |
| `ride:request` | passenger → server | create + dispatch request |
| `ride:new` | server → drivers room | broadcast new request |
| `ride:accept` | driver → server | atomic single-driver claim |
| `ride:taken` | server → drivers | remove claimed ride from other lists |
| `ride:status` | driver → server | lifecycle transitions |
| `ride:update` | server → ride room | status push to passenger/admin |

---

## 🗂 Project structure

```
campusride/
├── server/                 Express + Socket.IO + node:sqlite
│   └── src/
│       ├── index.js        app + websocket bootstrap
│       ├── db.js           schema + tx() helper
│       ├── socket.js       real-time dispatch engine
│       ├── campus.js       IIT-R geography + fare/ETA engine
│       ├── forecast.js     demand-forecast model
│       ├── seed.js         demo data (60-day history)
│       └── routes/         auth · rides · drivers · ratings · payments · analytics
├── client/                 React + Vite + Tailwind
│   └── src/
│       ├── pages/          Home · Passenger · Driver · Tracking · Admin · Login
│       ├── components/     Navbar · ui · icons
│       ├── context/        AuthContext
│       ├── api.js          REST client
│       └── socket.js       Socket.IO singleton
├── docs/DESIGN.pdf         8-page design document
└── docker-compose.yml
```

---

## 🔐 Design notes

- **Single-driver guarantee** — acceptance is a conditional `UPDATE ... WHERE status='requested' AND driver_id IS NULL`. Only the first driver's update affects a row; everyone else gets *"ride already taken."* No race conditions, no locks needed.
- **Rooms** — each ride uses a `ride:<id>` room so status/location pushes reach exactly the passenger + assigned driver. Online drivers share a `drivers` room for broadcast dispatch.
- **Auth on the socket** — every socket authenticates with the JWT in its handshake before any event is processed.
- **Consistent ride state** — status transitions are timestamped (`accepted_at`, `started_at`, `completed_at`) and constrained at the schema level.

Built by **Ashish Kumar Agrawal**, IIT Roorkee.
