import { useEffect, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell,
} from 'recharts';
import { api } from '../api';
import { getSocket } from '../socket';
import { Card, StatCard, StatusPill } from '../components/ui';
import { Activity, Car, Users, Bolt } from '../components/icons';

const RANGES = ['Today', '7d', '30d', '90d'];

import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { user, demoLogin } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    const signedAs = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Guest';
    return (
      <Card className="max-w-md mx-auto text-center !p-8">
        <div className="w-14 h-14 mx-auto rounded-xl2 gradient-brand grid place-items-center text-white mb-4"><Car size={26}/></div>
        <h2 className="text-2xl font-extrabold">Admin dashboard</h2>
        <p className="muted mt-2">You're signed in as a {signedAs}. Switch to the Admin account to access the Admin Dashboard.</p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button className="btn-primary" onClick={() => demoLogin('admin')}>Continue as admin</button>
        </div>
      </Card>
    );
  }
  const [range, setRange] = useState('7d');
  const [ov, setOv] = useState(null);
  const [peak, setPeak] = useState(null);
  const [heat, setHeat] = useState(null);
  const [fc, setFc] = useState(null);
  const [rev, setRev] = useState([]);
  const [active, setActive] = useState([]);

  const loadLive = () => {
    api.overview().then(setOv).catch(() => {});
    api.activeRides().then((d) => setActive(d.rides)).catch(() => {});
  };

  useEffect(() => {
    loadLive();
    api.peakHours().then(setPeak).catch(() => {});
    api.heatmap().then(setHeat).catch(() => {});
    api.forecast().then(setFc).catch(() => {});
    api.revenue().then((d) => setRev(d.series)).catch(() => {});
    const s = getSocket();
    const refresh = () => loadLive();
    s?.on('ride:update', refresh);
    s?.on('drivers:count', refresh);
    const t = setInterval(loadLive, 8000);
    return () => { s?.off('ride:update', refresh); s?.off('drivers:count', refresh); clearInterval(t); };
  }, []);

  const util = ov?.utilization ?? 78;
  const donut = [
    { name: 'Active', value: util, color: '#1487d6' },
    { name: 'Idle', value: Math.round((100 - util) * 0.6), color: '#22d3c5' },
    { name: 'Break', value: 100 - util - Math.round((100 - util) * 0.6), color: '#94a3b8' },
  ];

  const fcData = fc ? [
    ...fc.actual.map((a) => ({ label: a.label, actual: a.value })),
    ...fc.forecast.map((f) => ({ label: f.label, forecast: f.value })),
  ] : [];

  const peakSeries = peak?.series?.map((p) => ({ hour: `${p.hour}:00`, rides: p.rides })) ?? [];
  const maxPickup = Math.max(1, ...(heat?.zones?.map((z) => z.pickups) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">Operations</div>
          <h1 className="text-4xl font-extrabold text-ink dark:text-white">Analytics dashboard</h1>
        </div>
        <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-card">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${range === r ? 'gradient-brand text-white' : 'muted'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} value={ov?.activeRides ?? '—'} label="Active rides now" delta="+12%" />
        <StatCard icon={Car} value={`${ov?.onlineDrivers ?? '—'} / ${ov?.totalDrivers ?? '—'}`} label="Drivers online" delta={`${util}% utilization`} />
        <StatCard icon={Users} value={(ov?.ridersToday ?? 0).toLocaleString()} label="Riders today" delta="+18% vs yesterday" />
        <StatCard icon={Bolt} value={`${ov?.avgWaitMin ?? 2.4} min`} label="Avg wait" delta="-22s" />
      </div>

      {/* peak + utilization */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between mb-2">
            <div><h3 className="font-bold text-lg">Peak hour demand</h3><p className="text-sm muted">Rides per hour · last 24h</p></div>
            {peak?.peak && <span className="pill bg-brand-100 text-brand-700">Peak: {peak.peak.hour}:00 · {peak.peak.rides} rides</span>}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={peakSeries} margin={{ left: -18, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="peakFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1487d6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1487d6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={2} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tip} />
              <Area type="monotone" dataKey="rides" stroke="#1487d6" strokeWidth={2.5} fill="url(#peakFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-bold text-lg">Driver utilization</h3>
          <p className="text-sm muted">{ov?.onlineDrivers ?? 0} drivers online</p>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={donut} innerRadius={62} outerRadius={84} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                  {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center"><div className="text-3xl font-extrabold">{util}%</div><div className="text-[10px] font-bold tracking-widest muted">ACTIVE</div></div>
            </div>
          </div>
          <div className="space-y-1.5 mt-2">
            {donut.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />{d.name}</span>
                <span className="font-bold">{d.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* heatmap + forecast */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div><h3 className="font-bold text-lg">Demand heatmap</h3><p className="text-sm muted">Top pickup zones · today</p></div>
            <span className="pill bg-emerald-100 text-emerald-700">Live</span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {(heat?.zones ?? []).slice(0, 8).map((z) => {
              const intensity = z.pickups / maxPickup;
              return (
                <div key={z.zone} className="relative rounded-xl2 p-3 h-24 flex flex-col justify-between text-white overflow-hidden"
                  style={{ background: `linear-gradient(135deg, rgba(20,135,214,${0.35 + intensity * 0.6}), rgba(34,211,197,${0.3 + intensity * 0.5}))` }}>
                  <div className="self-end font-extrabold">{z.pickups}</div>
                  <div className="text-xs font-semibold leading-tight">{z.zone}</div>
                </div>
              );
            })}
          </div>
          {heat?.hottest && (
            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="muted">📍 Hottest: <b className="text-ink dark:text-white">{heat.hottest.zone}</b> · {heat.hottest.pickups} pickups</span>
              <span className="flex items-center gap-2 text-xs muted">Low <span className="w-20 h-2 rounded-full bg-gradient-to-r from-brand-100 to-brand-500" /> High</span>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-start justify-between mb-2">
            <div><h3 className="font-bold text-lg">14-day forecast</h3><p className="text-sm muted">Predicted ride volume</p></div>
            <span className="pill bg-slate-100 text-slate-600">ML model · {fc?.model?.includes('ewma') ? 'v2.1' : '—'}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={fcData} margin={{ left: -18, right: 6, top: 6 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={2} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tip} />
              <Line type="monotone" dataKey="actual" stroke="#1487d6" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="forecast" stroke="#10b8ad" strokeWidth={2.5} strokeDasharray="6 5" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 text-sm font-semibold">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-brand-500" /> actual</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-teal-500" /> forecast</span>
          </div>
        </Card>
      </div>

      {/* active rides */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div><h3 className="font-bold text-lg">Active rides</h3><p className="text-sm muted">Live · auto-refreshing</p></div>
          <span className="pill bg-emerald-100 text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {active.length} in progress</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left muted text-xs uppercase tracking-wide">
              <th className="py-2">Ride</th><th>Driver</th><th>Route</th><th>Status</th><th className="text-right">Fare</th>
            </tr></thead>
            <tbody>
              {active.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-3 font-semibold">{r.code}</td>
                  <td className="muted">{r.driver_name || '—'}</td>
                  <td className="muted">{r.pickup} → {r.drop_loc}</td>
                  <td><StatusPill status={r.status} /></td>
                  <td className="text-right font-bold">₹{r.fare}</td>
                </tr>
              ))}
              {active.length === 0 && <tr><td colSpan="5" className="py-6 text-center muted">No active rides right now.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* revenue */}
      <Card>
        <h3 className="font-bold text-lg mb-3">Revenue · last 7 days</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rev.map((r) => ({ day: new Date(r.d).toLocaleDateString('en', { weekday: 'short' }), revenue: r.revenue }))} margin={{ left: -10 }}>
            <defs>
              <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1487d6" /><stop offset="100%" stopColor="#22d3c5" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tip} formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
            <Bar dataKey="revenue" fill="url(#revBar)" radius={[8, 8, 0, 0]} maxBarSize={64} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

const tip = { borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(16,40,70,0.12)', fontSize: 13 };
