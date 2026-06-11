import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getSocket, connectSocket } from '../socket';
import { Card, StatCard } from '../components/ui';
import { Bolt, Users, Clock, Leaf, Shield, Star, Trend, Pin } from '../components/icons';

const COVERAGE = ['Main Gate', 'Bhawan Cluster', 'MAC', 'Lecture Halls', 'Tinkering Lab', 'PI Hostel', 'Convocation'];

export default function Home() {
  const nav = useNavigate();
  const [zones, setZones] = useState([]);
  const [pickup, setPickup] = useState('Rajendra Bhawan');
  const [drop, setDrop] = useState('LHC');
  const [type, setType] = useState('share');
  const [quote, setQuote] = useState(null);
  const [ov, setOv] = useState(null);
  const [booking, setBooking] = useState(false);
  const [heroImageLoaded, setHeroImageLoaded] = useState(true);

  useEffect(() => {
    api.zones().then((d) => setZones(d.zones)).catch(() => {});
    api.overview().then(setOv).catch(() => {});
  }, []);

  useEffect(() => {
    if (pickup && drop && pickup !== drop)
      api.quote(pickup, drop, type).then(setQuote).catch(() => setQuote(null));
  }, [pickup, drop, type]);

  const book = () => {
    if (pickup === drop) return;
    setBooking(true);
    const s = getSocket() || connectSocket();
    s.emit('ride:request', { pickup, drop, rideType: type }, ({ ride, error }) => {
      setBooking(false);
      if (error) return alert(error);
      nav(`/tracking/${ride.id}`);
    });
  };

  const fmtWait = ov ? `${ov.avgWaitMin}m` : '2.4m';

  return (
    <div className="space-y-10">
      {/* hero */}
      <section className="grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <span className="pill bg-emerald-100 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Live across campus · 24/7
          </span>
          <h1 className="mt-5 text-6xl font-extrabold leading-[1.02] text-ink dark:text-white">
            Campus rides,<br/>
            <span className="bg-gradient-to-r from-brand-500 to-teal-500 bg-clip-text text-transparent">in seconds.</span>
          </h1>
          <p className="mt-5 text-lg muted max-w-lg">
            CampusRide connects IIT Roorkee students with verified e-rickshaw drivers — from Main Gate to MAC,
            from Bhawan to Lecture Halls. Tap, ride, done.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <button className="btn-primary" onClick={book} disabled={booking}>Book a ride →</button>
            <button className="btn-ghost" onClick={() => nav('/driver')}>Drive with us</button>
          </div>
          <div className="flex flex-wrap gap-6 mt-7 text-sm font-semibold muted">
            <span className="flex items-center gap-2"><Shield size={18} className="text-teal-500"/> Verified drivers</span>
            <span className="flex items-center gap-2"><Star size={18} filled className="text-amber-400"/> 4.9 avg rating</span>
            <span className="flex items-center gap-2"><Leaf size={18} className="text-emerald-500"/> 100% EV</span>
          </div>
        </div>

        {/* booking card */}
        <Card className="!p-6 shadow-lift">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Book a ride</h3>
            <span className="pill bg-emerald-100 text-emerald-700">{ov?.onlineDrivers ?? 3} nearby</span>
          </div>
          <ZoneRow color="brand" label="Pickup" value={pickup} zones={zones} onChange={setPickup} />
          <div className="h-2" />
          <ZoneRow color="teal" label="Drop" value={drop} zones={zones} onChange={setDrop} />

          <div className="grid grid-cols-3 gap-2 mt-4">
            {[['solo', '1 seat'], ['share', 'Pool'], ['cargo', 'Luggage']].map(([t, sub]) => (
              <button key={t} onClick={() => setType(t)}
                className={`rounded-xl2 border p-3 text-left transition ${type === t
                  ? 'border-brand-400 ring-2 ring-brand-200 bg-brand-50/60 dark:bg-slate-800'
                  : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="text-xs muted capitalize">{t}</div>
                <div className="font-extrabold text-lg">₹{quote?.quotes?.[t] ?? '—'}</div>
                <div className="text-[11px] muted">{sub}</div>
              </button>
            ))}
          </div>

          <button onClick={book} disabled={booking || pickup === drop} className="btn-primary w-full !py-3 mt-4">
            {booking ? 'Requesting…' : `Confirm ride · ETA ${quote ? Math.max(1, Math.round(quote.etaSeconds / 60)) : 3} min`}
          </button>
            <div className="flex items-center justify-between mt-3 text-sm muted">
            <span>Driver · EV-04</span>
            <span className="flex items-center gap-1 font-semibold text-ink dark:text-white">
              <Star size={14} filled className="text-amber-400"/> 4.92
            </span>
          </div>
        </Card>
      </section>

      {/* KPI cards */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Bolt}  value={ov ? ov.completedToday.toLocaleString() : '2,847'} label="Rides today" delta="+18%" />
        <StatCard icon={Users} value={ov?.onlineDrivers ?? 126} label="Active drivers" delta="+4" />
        <StatCard icon={Clock} value={fmtWait} label="Avg. wait" delta="-22s" />
        <StatCard icon={Leaf}  value="412kg" label="CO₂ saved" delta="this week" />
      </section>

      {/* hero illustration */}
      <section>
        <Card className="!p-0 overflow-hidden">
          <div className="relative h-72 bg-slate-100 dark:bg-slate-900">
            <img
              src="/hero-image.jpg"
              alt="CampusRide hero"
              className="object-cover w-full h-full"
              onError={() => setHeroImageLoaded(false)}
            />
            {!heroImageLoaded && (
              <div className="absolute inset-0 grid place-items-center text-center px-6">
                <div className="text-xl font-bold">Hero image not found</div>
                <div className="text-sm muted mt-2">Unable to load the hero image from public/hero-image.jpg.</div>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* coverage */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">Coverage</div>
            <h2 className="text-3xl font-extrabold text-ink dark:text-white">Every corner of campus</h2>
          </div>
          <button className="text-brand-600 font-semibold" onClick={() => nav('/tracking')}>View map →</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {COVERAGE.map((c) => (
            <span key={c} className="px-4 py-2 rounded-full bg-white dark:bg-slate-800 shadow-card font-semibold text-sm">{c}</span>
          ))}
        </div>
      </section>

      {/* features */}
      <section className="grid md:grid-cols-3 gap-4">
        <Feature icon={Bolt} title="Sub-3-minute pickups" body="Smart dispatch routes the nearest driver, every time." />
        <Feature icon={Shield} title="Verified & safe" body="ID-verified drivers, SOS, and trip sharing built-in." />
        <Feature icon={Trend} title="Fair, transparent pricing" body="No surge. Flat campus fares from ₹12." />
      </section>
    </div>
  );
}

function ZoneRow({ color, label, value, zones, onChange }) {
  const ring = color === 'brand' ? 'gradient-brand' : 'bg-gradient-to-r from-teal-400 to-teal-500';
  return (
    <div className="flex items-center gap-3 rounded-xl2 bg-slate-50 dark:bg-slate-800 p-3">
      <div className={`w-9 h-9 rounded-full ${ring} grid place-items-center text-white`}><Pin size={18}/></div>
      <div className="flex-1">
        <div className="text-xs muted font-semibold">{label}</div>
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent font-bold text-ink dark:text-white outline-none">
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, body }) {
  return (
    <Card>
      <div className="w-11 h-11 rounded-xl2 gradient-brand grid place-items-center text-white mb-4"><Icon size={20}/></div>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="muted mt-1">{body}</p>
    </Card>
  );
}

function Rickshaw() {
  return (
    <svg viewBox="0 0 400 240" className="absolute right-6 bottom-0 h-64" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="200" cy="220" rx="150" ry="14" fill="rgba(0,0,0,0.08)"/>
      <path d="M120 90 q10-45 70-45 h40 q40 0 55 50 l8 60 h-185 z" fill="#16a34a"/>
      <path d="M120 90 q10-45 70-45 h40 q40 0 55 50 l3 22 h-175 z" fill="#22c55e"/>
      <rect x="150" y="60" width="70" height="40" rx="6" fill="#bae6fd"/>
      <rect x="230" y="62" width="44" height="38" rx="6" fill="#bae6fd"/>
      <rect x="110" y="150" width="200" height="36" rx="10" fill="#15803d"/>
      <circle cx="150" cy="195" r="26" fill="#1f2937"/><circle cx="150" cy="195" r="11" fill="#9ca3af"/>
      <circle cx="280" cy="195" r="26" fill="#1f2937"/><circle cx="280" cy="195" r="11" fill="#9ca3af"/>
      <circle cx="305" cy="150" r="7" fill="#fde047"/>
      <rect x="95" y="120" width="22" height="40" rx="6" fill="#166534"/>
    </svg>
  );
}
