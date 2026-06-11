import { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import { getSocket } from '../socket';
import { useAuth } from '../context/AuthContext';
import { Card, Avatar, Stars, StatCard, StatusPill } from '../components/ui';
import { Wallet, Bolt, Star, Clock, Check, X, Pin, Car } from '../components/icons';

export default function Driver() {
  const { user, driver, demoLogin } = useAuth();
  const [dash, setDash] = useState(null);
  const [online, setOnline] = useState(false);
  const [requests, setRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [feed, setFeed] = useState([]);

  const ACTIVE_RIDE_STATUSES = ['accepted', 'en_route', 'arrived', 'picked_up', 'driving', 'arrived_destination', 'in_progress'];
  const isDriver = user?.role === 'driver';

  const load = async () => {
    try {
      const dash = await api.driverDashboard();
      setDash(dash);
      setOnline(!!dash.driver.is_online);
    } catch {}

    try {
      const rides = await api.myRides();
      setActiveRide(rides.rides.find((r) => ACTIVE_RIDE_STATUSES.includes(r.status)) || null);
    } catch {}
  };

  useEffect(() => {
    if (!isDriver) return;
    load();
    api.openRides().then((d) => setRequests(d.rides)).catch(() => {});
    if (driver?.id) api.driverRatings(driver.id).then((d) => setFeed(d.feed)).catch(() => {});

    const s = getSocket();
    const onNew = (ride) => setRequests((rs) => (rs.find((r) => r.id === ride.id) ? rs : [ride, ...rs]));
    const onTaken = ({ rideId }) => setRequests((rs) => rs.filter((r) => r.id !== rideId));
    const refresh = () => load();

    s?.on('ride:new', onNew);
    s?.on('ride:taken', onTaken);
    s?.on('ride:update', refresh);
    return () => { s?.off('ride:new', onNew); s?.off('ride:taken', onTaken); s?.off('ride:update', refresh); };
  }, [isDriver, driver?.id]);

  const toggle = async () => {
    const next = !online; setOnline(next);
    const s = getSocket();
    s?.emit(next ? 'driver:online' : 'driver:offline', { lat: driver?.lat, lng: driver?.lng });
    try { await api.setAvailability(next); } catch {}
  };

  const accept = (ride) => {
    const s = getSocket();
    s?.emit('ride:accept', { rideId: ride.id }, ({ error }) => {
      if (error) return alert(error);
      setRequests((rs) => rs.filter((r) => r.id !== ride.id));
      load();
    });
  };
  const decline = (ride) => {
    getSocket()?.emit('ride:reject', { rideId: ride.id });
    setRequests((rs) => rs.filter((r) => r.id !== ride.id));
  };

  const rideAction = {
    accepted: ['en_route', 'Start route to pickup'],
    en_route: ['arrived', 'Arrived at pickup'],
    arrived: ['picked_up', 'Passenger picked up'],
    picked_up: ['driving', 'Head to destination'],
    driving: ['arrived_destination', 'Arrived at destination'],
    arrived_destination: ['completed', 'Complete drop'],
  };

  const updateRideStatus = (status) => {
    if (!activeRide) return;
    setUpdatingStatus(true);
    getSocket()?.emit('ride:status', { rideId: activeRide.id, status }, ({ error, ride }) => {
      setUpdatingStatus(false);
      if (error) return alert(error);
      setActiveRide(ride);
      load();
    });
  };

  if (!isDriver) {
    const signedAs = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Guest';
    return (
      <Card className="max-w-md mx-auto text-center !p-8">
        <div className="w-14 h-14 mx-auto rounded-xl2 gradient-brand grid place-items-center text-white mb-4"><Car size={26}/></div>
        <h2 className="text-2xl font-extrabold">Driver console</h2>
        <p className="muted mt-2">You're signed in as a {signedAs}. Switch to the driver account to see live incoming requests, earnings and ratings.</p>
        <button className="btn-primary mt-5" onClick={() => demoLogin('driver')}>Continue as driver</button>
      </Card>
    );
  }

  const d = dash?.driver;
  const todayEarn = dash?.today?.earnings ?? 0;
  const todayRides = dash?.today?.rides ?? 0;
  const weekly = (dash?.weekly ?? []).map((w) => ({ d: w.d, e: w.earnings }));
  const weekTotal = weekly.reduce((s, w) => s + w.e, 0);
  const dist = dash?.distribution ?? {};
  const totalRatings = Object.values(dist).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* main column */}
      <div className="lg:col-span-2 space-y-4">
        {/* header */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar name={user.name} />
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              </div>
              <div>
                <div className="text-xl font-extrabold">{user.name}</div>
                <div className="muted text-sm">{d?.vehicle_code} · IIT Roorkee Fleet</div>
              </div>
            </div>
            <button onClick={toggle} className="card !p-2 !pr-3 flex items-center gap-2">
              <span className="text-sm font-semibold pl-2">You're <span className={online ? 'text-emerald-500' : 'muted'}>{online ? 'Online' : 'Offline'}</span></span>
              <span className={`w-12 h-7 rounded-full p-1 transition ${online ? 'bg-brand-500' : 'bg-slate-300'}`}>
                <span className={`block w-5 h-5 bg-white rounded-full transition ${online ? 'translate-x-5' : ''}`} />
              </span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Mini icon={Wallet} top="+12%" value={`₹${todayEarn}`} label="Today" />
            <Mini icon={Bolt} top="8 hours" value={todayRides} label="Rides" />
            <Mini icon={Star} top={`${d?.total_trips ?? 0} trips`} value={d?.rating?.toFixed(2)} label="Rating" />
            <Mini icon={Clock} top="since 8am" value="6.4h" label="Online" />
          </div>
        </Card>

        {activeRide && (
          <Card className="!p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">Active trip</div>
                <div className="text-2xl font-extrabold mt-2">{activeRide.passenger_name}</div>
                <div className="text-sm muted mt-1">{activeRide.pickup} → {activeRide.drop_loc}</div>
                <div className="text-sm muted mt-2">Ride #{activeRide.code} · ₹{activeRide.fare}</div>
              </div>
              <StatusPill status={activeRide.status === 'in_progress' ? 'driving' : activeRide.status} />
            </div>
            <div className="grid gap-3 mt-5">
              {activeRide.status === 'completed' ? (
                <div className="rounded-xl2 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600">
                  Ride completed. Thank you for a safe trip.
                </div>
              ) : (
                (() => {
                  const action = rideAction[activeRide.status];
                  return action ? (
                    <button
                      className="btn-primary"
                      disabled={updatingStatus}
                      onClick={() => updateRideStatus(action[0])}
                    >
                      {updatingStatus ? 'Updating…' : action[1]}
                    </button>
                  ) : (
                    <div className="rounded-xl2 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600">
                      Waiting for the next status step.
                    </div>
                  );
                })()
              )}
            </div>
          </Card>
        )}
        {/* incoming requests */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg flex items-center gap-2">Incoming requests
              <span className="pill bg-brand-500 text-white !px-2">{requests.length}</span></h3>
            <span className="pill bg-slate-100 text-slate-600">Auto-match {online ? 'on' : 'off'}</span>
          </div>
          {!online && <p className="muted text-sm">Go online to start receiving ride requests.</p>}
          <div className="space-y-3">
            {requests.slice(0, 5).map((r) => (
              <div key={r.id} className="rounded-xl2 border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.passenger_name} color="bg-teal-100 text-teal-700" />
                    <div>
                      <div className="font-bold">{r.passenger_name}</div>
                      <div className="text-sm muted flex items-center gap-1"><Star size={13} filled className="text-amber-400"/> 4.8</div>
                    </div>
                  </div>
                  <div className="text-right"><div className="font-extrabold text-lg">₹{r.fare}</div><div className="text-xs muted">{r.pickup} → {r.drop_loc}</div></div>
                </div>
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-500"/>Pickup · {r.pickup}</span>
                  <span className="muted">·</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500"/>Drop · {r.drop_loc}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <button onClick={() => decline(r)} className="btn-ghost flex items-center justify-center gap-2"><X size={16}/> Decline</button>
                  <button onClick={() => accept(r)} className="btn-primary col-span-2 flex items-center justify-center gap-2"><Check size={16}/> Accept · pickup in 2 min</button>
                </div>
              </div>
            ))}
            {online && requests.length === 0 && <p className="muted text-sm">Waiting for ride requests…</p>}
          </div>
        </Card>

        {/* ride history */}
        <Card>
          <h3 className="font-bold text-lg mb-2">Ride history</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(dash?.recent ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={r.passenger_name} color="bg-slate-100 text-slate-600" />
                  <div><div className="font-bold">{r.passenger_name}</div>
                    <div className="text-sm muted flex items-center gap-1"><Pin size={13}/> {r.pickup} → {r.drop_loc}</div></div>
                </div>
                <div className="text-right"><div className="font-bold">₹{r.fare}</div><Stars value={r.stars || 5} size={13} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* side column */}
      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Weekly earnings</h3>
            <span className="text-emerald-500 font-semibold text-sm">+18%</span>
          </div>
          <div className="stat-num mt-2">₹{weekTotal.toLocaleString()}</div>
          <div className="muted text-sm">vs ₹{Math.round(weekTotal * 0.85).toLocaleString()} last week</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={weekly} margin={{ top: 10 }}>
              <defs><linearGradient id="earn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1487d6" stopOpacity={0.4}/><stop offset="100%" stopColor="#1487d6" stopOpacity={0}/>
              </linearGradient></defs>
              <Area type="monotone" dataKey="e" stroke="#1487d6" strokeWidth={2.5} fill="url(#earn)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-bold text-lg">Passenger ratings</h3>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-5xl font-extrabold">{d?.rating?.toFixed(2)}</span>
            <span className="muted text-sm mb-2">based on {d?.total_trips} trips</span>
          </div>
          <div className="space-y-1.5 mt-3">
            {[5, 4, 3, 2, 1].map((s) => {
              const pct = Math.round((dist[s] / totalRatings) * 100);
              return (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <span className="w-3 font-semibold">{s}</span><Star size={13} filled className="text-amber-400"/>
                  <span className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <span className="block h-full gradient-brand" style={{ width: `${pct}%` }} /></span>
                  <span className="muted w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {(feed.length ? feed : [{ comment: 'Smooth ride 👍' }, { comment: 'Always on time' }, { comment: 'Polite & helpful' }])
              .filter((f) => f.comment).slice(0, 3).map((f, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 text-sm font-medium">"{f.comment}"</span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Mini({ icon: Icon, top, value, label }) {
  return (
    <div className="rounded-xl2 border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-center justify-between text-slate-400"><Icon size={18} /><span className="text-xs muted">{top}</span></div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
      <div className="text-xs muted">{label}</div>
    </div>
  );
}
