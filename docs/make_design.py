"""Generate the CampusRide design document (PDF, <= 8 pages)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, Flowable, ListFlowable, ListItem)

BRAND = colors.HexColor('#1487d6')
TEAL = colors.HexColor('#10b8ad')
INK = colors.HexColor('#0c1b2a')
GREY = colors.HexColor('#64748b')
LIGHT = colors.HexColor('#eaf4fc')

styles = getSampleStyleSheet()
S = {
    'h1': ParagraphStyle('h1', parent=styles['Heading1'], fontName='Helvetica-Bold',
                         fontSize=18, textColor=INK, spaceBefore=14, spaceAfter=6),
    'h2': ParagraphStyle('h2', parent=styles['Heading2'], fontName='Helvetica-Bold',
                         fontSize=13, textColor=BRAND, spaceBefore=12, spaceAfter=4),
    'body': ParagraphStyle('body', parent=styles['Normal'], fontName='Helvetica',
                           fontSize=9.7, textColor=INK, leading=14, spaceAfter=6),
    'small': ParagraphStyle('small', parent=styles['Normal'], fontName='Helvetica',
                            fontSize=8.4, textColor=GREY, leading=11),
    'code': ParagraphStyle('code', parent=styles['Normal'], fontName='Courier',
                           fontSize=8, textColor=INK, leading=11, backColor=LIGHT),
}

def P(t, s='body'): return Paragraph(t, S[s])
def bullets(items, s='body'):
    return ListFlowable([ListItem(Paragraph(i, S[s]), leftIndent=10) for i in items],
                        bulletType='bullet', bulletColor=TEAL, leftIndent=12, spaceAfter=6)

class HR(Flowable):
    def __init__(self, w, color=BRAND, t=1.4): self.w, self.color, self.t = w, color, t
    def wrap(self, *a): return (self.w, self.t + 4)
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(self.t)
        self.canv.line(0, 2, self.w, 2)

class Cover(Flowable):
    def __init__(self, w): self.w = w; self.h = 150
    def wrap(self, *a): return (self.w, self.h)
    def draw(self):
        c = self.canv
        c.setFillColor(BRAND); c.roundRect(0, 0, self.w, self.h, 14, fill=1, stroke=0)
        c.setFillColor(colors.white); c.circle(self.w-30, self.h-30, 60, fill=1, stroke=0)
        c.setFillColor(BRAND); c.circle(self.w-30, self.h-30, 56, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 30); c.drawString(28, self.h-56, 'CampusRide')
        c.setFont('Helvetica', 12.5); c.drawString(28, self.h-78, 'Real-Time Campus Mobility & Ride Management Platform')
        c.setFont('Helvetica', 10); c.setFillColor(colors.HexColor('#bfe3ff'))
        c.drawString(28, self.h-100, 'Design Document  ·  Cult Open Projects 2026  ·  Problem Statement 2')
        c.drawString(28, 22, 'IIT Roorkee   ·   Ashish Kumar Agrawal')

# ERD as a drawn diagram
class ERD(Flowable):
    def __init__(self, w): self.w = w; self.h = 360
    def wrap(self, *a): return (self.w, self.h)
    def _box(self, x, y, w, h, title, rows):
        c = self.canv
        c.setFillColor(BRAND); c.roundRect(x, y, w, h, 6, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setFont('Helvetica-Bold', 9)
        c.drawString(x+8, y+h-13, title)
        c.setFillColor(colors.white); c.roundRect(x, y, w, h-18, 6, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor('#cfe2f3')); c.setLineWidth(1)
        c.roundRect(x, y, w, h-18, 6, fill=0, stroke=1)
        c.setFillColor(INK); c.setFont('Helvetica', 7.3)
        for i, r in enumerate(rows):
            c.drawString(x+8, y+h-32-i*11, r)
    def _link(self, x1, y1, x2, y2, label):
        c = self.canv; c.setStrokeColor(TEAL); c.setLineWidth(1.4)
        c.line(x1, y1, x2, y2)
        c.setFillColor(TEAL); c.setFont('Helvetica-Bold', 6.6)
        c.drawString((x1+x2)/2-12, (y1+y2)/2+2, label)
    def draw(self):
        self._box(10, 250, 150, 95, 'users',
                  ['id PK', 'name, email UQ', 'password_hash', "role (pax/driver/admin)", 'phone, created_at'])
        self._box(10, 120, 150, 110, 'drivers',
                  ['id PK', 'user_id FK→users UQ', 'vehicle_code UQ', 'verified, is_online', 'lat, lng', 'rating, total_trips'])
        self._box(210, 235, 175, 130, 'rides',
                  ['id PK', 'code UQ (CR-####)', 'passenger_id FK→users', 'driver_id FK→drivers', 'pickup, drop_loc (+lat/lng)', 'ride_type, status', 'fare, scheduled_for', 'requested/accepted/…_at'])
        self._box(210, 95, 175, 80, 'ratings',
                  ['id PK', 'ride_id FK→rides UQ', 'driver_id FK→drivers', 'stars (1-5), tags, comment'])
        self._box(210, 10, 175, 70, 'payments',
                  ['id PK', 'ride_id FK→rides', 'method (upi/qr/cash)', 'amount, status, txn_ref'])
        self._box(10, 10, 150, 70, 'audit_logs',
                  ['id PK', 'actor_id', 'action, meta', 'created_at'])
        self._link(160, 290, 210, 300, '1:N')   # users -> rides
        self._link(160, 165, 210, 280, '1:N')   # drivers -> rides
        self._link(300, 235, 300, 175, '1:1')   # rides -> ratings
        self._link(300, 95, 300, 80, '1:N')     # rides -> payments

doc = SimpleDocTemplate('/home/claude/campusride/docs/DESIGN.pdf', pagesize=A4,
                        leftMargin=18*mm, rightMargin=18*mm, topMargin=16*mm, bottomMargin=14*mm,
                        title='CampusRide Design Document', author='Ashish Kumar Agrawal')
W = doc.width
e = []

# ---- Page 1: cover + problem understanding ----
e += [Cover(W), Spacer(1, 14)]
e += [P('1 · Problem Understanding', 'h1'), HR(W)]
e += [P('IIT Roorkee\u2019s campus spans a large area and depends heavily on e-rickshaws for last-mile transport, '
        'yet ride requests and driver availability are coordinated through informal, fragmented channels. '
        'CampusRide replaces this with a centralised, real-time digital system connecting passengers and drivers.')]
e += [P('The platform is built around the engineering challenges the brief identifies as central:', 'body')]
e += [bullets([
    '<b>Real-time communication</b> \u2014 live ride status, driver availability, and assignment notifications over WebSockets.',
    '<b>Ride-assignment workflow</b> \u2014 a request must be assignable to exactly one driver, with no double-booking.',
    '<b>State synchronisation</b> \u2014 a single, consistent ride lifecycle visible to passenger, driver and operations.',
    '<b>Geospatial handling</b> \u2014 campus zones, distance-based fares, ETAs, and a live map.',
    '<b>Multi-user coordination & analytics</b> \u2014 dashboards for drivers and administrators.',
])]
e += [P('Scope was deliberately kept to the core ride-management problem rather than replicating every commercial '
        'ride-hailing feature, while still delivering all six bonus capabilities (live map, scheduling, digital '
        'payments, demand analytics, ML demand forecasting, advanced dashboard).')]

# ---- Page 2: architecture ----
e += [PageBreak(), P('2 · System Architecture', 'h1'), HR(W)]
e += [P('CampusRide is a two-tier full-stack application with a real-time channel layered over a conventional REST API.')]
e += [P('2.1 High-level components', 'h2')]
arch = [['Layer', 'Technology', 'Responsibility'],
        ['Client (SPA)', 'React 18, Vite, Tailwind, Recharts, React-Leaflet',
         'Passenger / Driver / Tracking / Admin UIs; Socket.IO client'],
        ['Transport', 'REST (HTTP) + Socket.IO (WebSocket)',
         'CRUD & queries over REST; live events over WebSocket'],
        ['Server', 'Node.js 22, Express, Socket.IO',
         'Auth, ride lifecycle, dispatch engine, analytics, forecasting'],
        ['Data', 'SQLite (built-in node:sqlite)',
         'Users, drivers, rides, ratings, payments, audit logs']]
t = Table(arch, colWidths=[W*0.16, W*0.34, W*0.50])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), BRAND), ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,-1), 8.4),
    ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT]),
    ('VALIGN', (0,0), (-1,-1), 'TOP'), ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5), ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#dbe7f1'))]))
e += [t, Spacer(1, 8)]
e += [P('2.2 Real-time dispatch flow', 'h2')]
e += [P('1. A passenger emits <font face="Courier">ride:request</font>; the server creates the ride and broadcasts '
        '<font face="Courier">ride:new</font> to the <font face="Courier">drivers</font> room. '
        '2. Online drivers see the request instantly and may emit <font face="Courier">ride:accept</font>. '
        '3. Acceptance runs a conditional UPDATE that succeeds for only the first driver; others receive '
        '<font face="Courier">\u201cride already taken\u201d</font>. 4. The passenger (in the per-ride room) receives '
        '<font face="Courier">ride:update</font> for every transition and the driver streams '
        '<font face="Courier">driver:location</font>, relayed as <font face="Courier">ride:location</font>.')]
e += [P('2.3 Room model', 'h2')]
e += [bullets([
    '<font face="Courier">user:&lt;id&gt;</font> \u2014 a private room every socket joins on connect.',
    '<font face="Courier">drivers</font> \u2014 all currently-online drivers; receives broadcast dispatch.',
    '<font face="Courier">ride:&lt;id&gt;</font> \u2014 the passenger plus the assigned driver; receives status & location.',
])]
e += [P('Every socket authenticates with its JWT during the handshake before any event is processed, so identity and '
        'role are trusted server-side.', 'small')]

# ---- Page 3: database schema ----
e += [PageBreak(), P('3 · Database Schema', 'h1'), HR(W)]
e += [P('Six normalised tables with foreign keys and CHECK constraints enforce integrity at the storage layer. '
        'Status and ride-type values are constrained so an invalid state can never be written.')]
schema = [['Table', 'Key columns', 'Notes'],
    ['users', 'id, email (UQ), role', "role \u2208 {passenger, driver, admin}"],
    ['drivers', 'user_id (FK,UQ), vehicle_code (UQ), is_online, rating', 'one profile per driver user'],
    ['rides', 'code (UQ), passenger_id (FK), driver_id (FK), status, fare', 'status & timestamps per stage'],
    ['ratings', 'ride_id (FK,UQ), driver_id (FK), stars', 'one rating per ride; recomputes avg'],
    ['payments', 'ride_id (FK), method, amount, txn_ref', 'method \u2208 {upi, qr, cash}'],
    ['audit_logs', 'actor_id, action, meta', 'key actions for traceability']]
t = Table(schema, colWidths=[W*0.16, W*0.46, W*0.38])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), TEAL), ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,-1), 8.2),
    ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'), ('TEXTCOLOR', (0,1), (0,-1), BRAND),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT]), ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('TOPPADDING', (0,0), (-1,-1), 5), ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#dbe7f1'))]))
e += [t, Spacer(1, 8)]
e += [P('3.1 Ride lifecycle (state machine)', 'h2')]
e += [P('<font face="Courier">requested \u2192 accepted \u2192 arrived \u2192 in_progress \u2192 completed</font>, with '
        '<font face="Courier">cancelled</font> reachable from any active state. Each transition writes a timestamp '
        '(<font face="Courier">accepted_at, started_at, completed_at, cancelled_at</font>), giving an auditable, '
        'consistent history and enabling the analytics queries.')]
e += [P('Indexes on rides.status, rides.passenger_id, rides.driver_id and drivers.is_online keep the live dispatch '
        'and dashboard queries fast as data grows.', 'small')]

# ---- Page 4: ERD ----
e += [PageBreak(), P('4 · Entity Relationship Diagram', 'h1'), HR(W), Spacer(1, 6), ERD(W)]
e += [P('Cardinalities: a <b>user</b> (passenger) has many <b>rides</b>; a <b>driver</b> fulfils many <b>rides</b>; '
        'each <b>ride</b> has at most one <b>rating</b> (1:1) and may have one or more <b>payments</b>. '
        'All relationships are enforced with foreign keys.', 'small')]

# ---- Page 5: API overview ----
e += [PageBreak(), P('5 · API Overview', 'h1'), HR(W)]
e += [P('5.1 REST endpoints', 'h2')]
api = [['Method', 'Path', 'Purpose'],
    ['POST', '/api/auth/register', 'Create passenger / driver account (JWT)'],
    ['POST', '/api/auth/login', 'Authenticate, return JWT'],
    ['GET', '/api/auth/me', 'Current user + driver profile'],
    ['GET', '/api/rides/quote', 'Fare + ETA preview (solo / share / cargo)'],
    ['GET', '/api/rides/open', 'Open requests for drivers'],
    ['GET', '/api/rides/active', 'Live rides for the ops board'],
    ['GET', '/api/rides/mine', 'Role-aware ride history'],
    ['GET', '/api/rides/scheduled', 'Upcoming scheduled rides'],
    ['PATCH', '/api/drivers/availability', 'Set online / offline'],
    ['GET', '/api/drivers/me/dashboard', 'Driver KPIs, earnings, ratings split'],
    ['POST', '/api/ratings', 'Submit rating; recompute driver average'],
    ['POST', '/api/payments', 'Simulated UPI / QR payment (+ upi:// link)'],
    ['GET', '/api/analytics/overview', 'KPI cards'],
    ['GET', '/api/analytics/peak-hours', 'Rides per hour (24h)'],
    ['GET', '/api/analytics/heatmap', 'Pickups per zone'],
    ['GET', '/api/analytics/forecast', '14-day demand forecast (ML)']]
t = Table(api, colWidths=[W*0.12, W*0.40, W*0.48])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), BRAND), ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,-1), 8),
    ('FONTNAME', (0,1), (1,-1), 'Courier'), ('TEXTCOLOR', (0,1), (0,-1), TEAL),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT]),
    ('TOPPADDING', (0,0), (-1,-1), 3.5), ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
    ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#dbe7f1'))]))
e += [t, Spacer(1, 8)]
e += [P('5.2 Socket.IO events', 'h2')]
e += [bullets([
    '<font face="Courier">driver:online / driver:offline</font> \u2014 availability toggle (broadcasts driver count).',
    '<font face="Courier">ride:request \u2192 ride:new</font> \u2014 passenger requests; broadcast to online drivers.',
    '<font face="Courier">ride:accept \u2192 ride:taken</font> \u2014 atomic claim; remove from other drivers\u2019 lists.',
    '<font face="Courier">ride:status \u2192 ride:update</font> \u2014 lifecycle transitions pushed to the ride room.',
    '<font face="Courier">driver:location \u2192 ride:location</font> \u2014 live GPS relayed to the passenger.',
])]

# ---- Page 6: design decisions ----
e += [PageBreak(), P('6 · Design Decisions', 'h1'), HR(W)]
e += [P('6.1 Atomic single-driver assignment', 'h2')]
e += [P('Rather than locking or a queue, acceptance is a single conditional statement: '
        '<font face="Courier">UPDATE rides SET driver_id=?, status=\u2018accepted\u2019 WHERE id=? AND '
        'status=\u2018requested\u2019 AND driver_id IS NULL</font>. SQLite guarantees only one writer mutates the row, '
        'so exactly one driver wins; the rest get a clean rejection. This is simple, race-free and verified by an '
        'automated test where a second driver is denied with \u201cride already taken.\u201d')]
e += [P('6.2 Built-in SQLite for reproducibility', 'h2')]
e += [P('The data layer uses Node 22\u2019s built-in <font face="Courier">node:sqlite</font> module instead of a '
        'native add-on or external database server. A grader needs only Node \u2265 22.5 \u2014 no compiler, no '
        '<font face="Courier">node-gyp</font>, no Postgres/Mongo \u2014 making the project install and run identically '
        'everywhere. A thin <font face="Courier">tx()</font> helper wraps multi-statement transactions.')]
e += [P('6.3 Rooms over manual fan-out', 'h2')]
e += [P('Socket.IO rooms target updates precisely (one ride\u2019s participants, or all online drivers) without the '
        'server tracking socket lists by hand, keeping the dispatch code small and correct.')]
e += [P('6.4 Transparent forecasting model', 'h2')]
e += [P('Demand forecasting uses an interpretable decomposition \u2014 OLS linear trend \u00d7 multiplicative weekly '
        'seasonal index, with an EWMA correction on recent residuals and an ~80% band from the fit RMSE. It is fast, '
        'dependency-free and explainable, and exposes the same JSON contract so it can later be swapped for an '
        'ARIMA / Prophet / gradient-boosted service without touching the API or UI.')]
e += [P('6.5 Fair, flat pricing', 'h2')]
e += [P('Fares are deterministic (base + distance, with a per-ride-type multiplier and a \u20b912 floor) \u2014 no '
        'surge \u2014 matching the campus context and giving passengers a predictable quote before they book.')]
e += [Spacer(1, 10), HR(W, TEAL),
      P('CampusRide \u2014 Real-Time Campus Mobility & Ride Management Platform \u00b7 IIT Roorkee', 'small')]

doc.build(e)
print('DESIGN.pdf built')
