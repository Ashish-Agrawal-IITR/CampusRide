import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getSocket } from '../socket';
import { useAuth } from '../context/AuthContext';
import { Card, Avatar, Stars, StatusPill } from '../components/ui';
import { Phone, Chat, Nav, Star, Pin, Bolt, Clock, Wallet, Plus } from '../components/icons';
import QRCode from 'react-qr-code';

const TAGS = ['Polite', 'Clean ride', 'Fast', 'On time'];

export default function Passenger() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [active, setActive] = useState(null);
  const [rateStars, setRateStars] = useState(4);
  const [rateTags, setRateTags] = useState([]);
  const [rated, setRated] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const load = () => {
    api.myRides().then((d) => {
      setRides(d.rides);
      setActive(d.rides.find((r) => ['accepted', 'en_route', 'arrived', 'picked_up', 'driving', 'arrived_destination', 'in_progress'].includes(r.status)) || null);
    }).catch(() => {});
    api.nearby().then((d) => setDrivers(d.drivers)).catch(() => {});
  };

  useEffect(() => {
    load();
    const s = getSocket();
    const onUpd = () => load();
    s?.on('ride:update', onUpd);
    return () => s?.off('ride:update', onUpd);
  }, []);

  const lastCompleted = rides.find((r) => r.status === 'completed');
  const weekSpent = rides.filter((r) => r.status === 'completed').slice(0, 14).reduce((s, r) => s + r.fare, 0);

  const submitRating = async () => {
    if (!lastCompleted) return;
    try { await api.rate({ rideId: lastCompleted.id, stars: rateStars, tags: rateTags }); setRated(true); }
    catch (e) { alert(e.message); }
  };
  const toggleTag = (t) => setRateTags((ts) => ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]);

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {/* greeting */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">Welcome back</div>
            <h1 className="text-4xl font-extrabold">Hey, {user.name.split(' ')[0]} 👋</h1>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => nav('/')}><Plus size={18}/> Book ride</button>
        </div>

        {/* active ride */}
        {active ? (
          <Card className="!p-6">
            <div className="flex items-start justify-between">
              <StatusPill status={active.status} />
              <div className="text-right muted text-sm">Ride #{active.code}</div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <Avatar name={active.driver_name || 'Driver'} />
                <div>
                  <div className="text-lg font-extrabold">{active.driver_name || 'Assigning…'} · {active.vehicle_code || ''}</div>
                  <div className="text-sm muted flex items-center gap-1"><Star size={13} filled className="text-amber-400"/> {active.driver_rating || '4.9'}</div>
                </div>
              </div>
              <div className="text-right"><div className="text-3xl font-extrabold">2:14</div><div className="text-xs muted">ETA</div></div>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-brand-500"/> Pickup · {active.pickup}</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-teal-500"/> Drop · {active.drop_loc}</div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5">
              <button className="btn-ghost flex items-center justify-center gap-2"><Phone size={16}/> Call</button>
              <button className="btn-ghost flex items-center justify-center gap-2"><Chat size={16}/> Message</button>
              <button className="btn-primary flex items-center justify-center gap-2" onClick={() => nav(`/tracking/${active.id}`)}><Nav size={16}/> Track</button>
            </div>
          </Card>
        ) : (
          <Card className="!p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl2 gradient-brand grid place-items-center text-white mb-3"><Nav size={22}/></div>
            <div className="font-bold text-lg">No active ride</div>
            <p className="muted">Book a ride from the home page and track it live here.</p>
            <button className="btn-primary mt-4" onClick={() => nav('/')}>Book a ride</button>
          </Card>
        )}

        {/* nearby drivers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-extrabold">Nearby drivers</h2>
            <span className="muted text-sm">{drivers.length} online within 600m</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {drivers.slice(0, 4).map((dr, i) => (
              <Card key={dr.id} className="!p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={dr.name} color="bg-teal-100 text-teal-700" />
                  <div><div className="font-bold">{dr.name}</div><div className="text-xs muted">{dr.vehicle_code} · {180 + i * 150}m away</div></div>
                </div>
                <div className="text-right"><div className="font-bold">{2 + i} min</div><div className="text-xs flex items-center gap-1 justify-end"><Star size={12} filled className="text-amber-400"/> {dr.rating?.toFixed(2)}</div></div>
              </Card>
            ))}
          </div>
        </div>

        {/* history */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-extrabold">Ride history</h2>
            <button className="text-brand-600 font-semibold text-sm">View all</button>
          </div>
          <Card className="!p-2">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {rides.filter((r) => r.status === 'completed').slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-slate-800 grid place-items-center text-brand-500"><Pin size={16}/></div>
                    <div><div className="font-bold">{r.pickup} → {r.drop_loc}</div><div className="text-xs muted">{r.completed_at?.slice(0, 16).replace('T', ' ')}</div></div>
                  </div>
                  <div className="text-right"><div className="font-bold">₹{r.fare}</div><Stars value={5} size={12}/></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* side */}
      <div className="space-y-4">
        {/* notifications */}
        <Card>
          <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-lg">Notifications</h3><span className="pill bg-brand-100 text-brand-700">3 new</span></div>
          {[['🚗', active ? `${active.driver_name || 'Driver'} is arriving soon` : 'Welcome to CampusRide', 'now'],
            ['⭐', 'Rate your last ride', '1h'],
            ['🔔', 'Weekend pass available — 20% off', '3h']].map(([e, t, time], i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 grid place-items-center">{e}</div>
              <div className="flex-1"><div className="font-semibold text-sm">{t}</div><div className="text-xs muted">{time}</div></div>
            </div>
          ))}
        </Card>

        {/* rate last ride */}
        <Card>
          <h3 className="font-bold text-lg">Rate your last ride</h3>
          {lastCompleted ? (
            <>
              <p className="muted text-sm">{lastCompleted.driver_name} · {lastCompleted.pickup} → {lastCompleted.drop_loc}</p>
              <div className="mt-4 space-y-3">
                <button className="btn-secondary w-full" onClick={() => setShowQr((v) => !v)}>
                  {showQr ? 'Hide ride QR' : 'Show ride QR'}
                </button>
                {showQr && (
                  <Card className="!p-4 bg-slate-50 dark:bg-slate-900">
                    <div className="mb-4">
                      <div className="font-semibold">Ride receipt QR</div>
                      <div className="text-xs muted">Scan to view ride details or share with the driver.</div>
                    </div>
                    <div className="flex items-center justify-center p-4 bg-white rounded-xl2 shadow-sm dark:bg-slate-950">
                      <QRCode
                        value={JSON.stringify({
                          rideId: lastCompleted.id,
                          code: lastCompleted.code,
                          pickup: lastCompleted.pickup,
                          drop: lastCompleted.drop_loc,
                          fare: lastCompleted.fare,
                          driver: lastCompleted.driver_name,
                          completedAt: lastCompleted.completed_at,
                        })}
                        size={176}
                        level="M"
                      />
                    </div>
                  </Card>
                )}
              </div>
              {rated ? (
                <div className="mt-4 text-emerald-600 font-semibold">Thanks — feedback submitted! ★</div>
              ) : (
                <>
                  <div className="flex gap-1 mt-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setRateStars(s)}>
                        <Star size={30} filled={s <= rateStars} className={s <= rateStars ? 'text-amber-400' : 'text-slate-300'} />
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {TAGS.map((t) => (
                      <button key={t} onClick={() => toggleTag(t)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${rateTags.includes(t)
                          ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-slate-200 dark:border-slate-700'}`}>{t}</button>
                    ))}
                  </div>
                  <button className="btn-primary w-full mt-4" onClick={submitRating}>Submit feedback</button>
                </>
              )}
            </>
          ) : <p className="muted text-sm mt-2">Complete a ride to leave a rating.</p>}
        </Card>

        {/* this week */}
        <Card>
          <h3 className="font-bold text-lg mb-3">This week</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Week icon={Bolt} value={rides.length} label="Rides" />
            <Week icon={Wallet} value={`₹${weekSpent}`} label="Spent" />
            <Week icon={Clock} value="3.1h" label="Saved" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Week({ icon: Icon, value, label }) {
  return (
    <div>
      <Icon size={18} className="mx-auto text-brand-500" />
      <div className="text-2xl font-extrabold mt-1">{value}</div>
      <div className="text-xs muted">{label}</div>
    </div>
  );
}
