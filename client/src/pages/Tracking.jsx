import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api';
import { getSocket } from '../socket';
import { Card, Avatar, StatusPill } from '../components/ui';
import { Phone, Chat, Check, Pin } from '../components/icons';

const driverIcon = L.divIcon({
  className: 'driver-marker',
  html: `<div style="width:40px;height:40px;border-radius:50%;background:#1487d6;border:4px solid #bfdbfe;
          display:grid;place-items:center;box-shadow:0 6px 16px rgba(20,135,214,.5)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"
          stroke-linejoin="round"><path d="M12 3l8 18-8-4-8 4 8-18z"/></svg></div>`,
  iconSize: [40, 40], iconAnchor: [20, 20],
});
const youIcon = L.divIcon({
  className: 'you-marker',
  html: `<div style="width:26px;height:26px;border-radius:50%;background:#10b8ad;border:4px solid #fff;
          box-shadow:0 0 0 6px rgba(16,184,173,.25)"></div>`,
  iconSize: [26, 26], iconAnchor: [13, 13],
});

function Recenter({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [60, 60], maxZoom: 17 });
  }, [points, map]);
  return null;
}

const STEPS = [
  ['requested', 'Ride requested'],
  ['accepted', 'Driver assigned'],
  ['en_route', 'Driver en route'],
  ['arrived', 'Arrived at pickup location'],
  ['picked_up', 'Passenger picked up'],
  ['driving', 'Driving to destination'],
  ['arrived_destination', 'Arrived at destination'],
  ['completed', 'Drop completed'],
];
const ORDER = ['requested', 'accepted', 'en_route', 'arrived', 'picked_up', 'driving', 'arrived_destination', 'completed'];
const ACTIVE_STATUSES = ['accepted', 'en_route', 'arrived', 'picked_up', 'driving', 'arrived_destination', 'in_progress'];

export default function Tracking() {
  const { rideId } = useParams();
  const [ride, setRide] = useState(null);
  const [pos, setPos] = useState(null);      // live driver position {lat,lng}
  const [eta, setEta] = useState(134);
  const animRef = useRef(null);

  const loadRide = async () => {
    try {
      let r;
      if (rideId) r = (await api.ride(rideId)).ride;
      else {
        const mine = (await api.myRides()).rides;
        r = mine.find((x) => ACTIVE_STATUSES.includes(x.status)) || mine[0];
        if (r) r = (await api.ride(r.id)).ride;
      }
      setRide(r);
    } catch {}
  };

  useEffect(() => { loadRide(); }, [rideId]);

  // Animate driver gliding toward the pickup, plus honor real socket location.
  useEffect(() => {
    if (!ride) return;
    const start = { lat: ride.driver_lat ?? ride.pickup_lat + 0.004, lng: ride.driver_lng ?? ride.pickup_lng + 0.004 };
    const target = ['picked_up', 'driving', 'arrived_destination', 'completed', 'in_progress'].includes(ride.status)
      ? { lat: ride.drop_lat, lng: ride.drop_lng }
      : { lat: ride.pickup_lat, lng: ride.pickup_lng };
    setPos(start);
    let t = 0;
    clearInterval(animRef.current);
    animRef.current = setInterval(() => {
      t = Math.min(1, t + 0.012);
      setPos({ lat: start.lat + (target.lat - start.lat) * t, lng: start.lng + (target.lng - start.lng) * t });
      setEta((e) => Math.max(0, Math.round(134 * (1 - t))));
      if (t >= 1) clearInterval(animRef.current);
    }, 350);

    const s = getSocket();
    const onLoc = ({ rideId: rid, lat, lng }) => { if (rid === ride.id) setPos({ lat, lng }); };
    const onUpd = (r) => { if (r.id === ride.id) setRide((prev) => ({ ...prev, ...r })); };
    s?.on('ride:location', onLoc);
    s?.on('ride:update', onUpd);
    return () => { clearInterval(animRef.current); s?.off('ride:location', onLoc); s?.off('ride:update', onUpd); };
  }, [ride?.id]);

  if (!ride) return <Card className="text-center !p-10 muted">No ride to track yet. Book one from Home.</Card>;

  const statusKey = ride.status === 'in_progress' ? 'driving' : ride.status;
  const stage = ORDER.indexOf(statusKey);
  const mm = String(Math.floor(eta / 60)).padStart(1, '0'), ss = String(eta % 60).padStart(2, '0');
  const points = [];
  if (pos) points.push([pos.lat, pos.lng]);
  const targetPoint = ['picked_up', 'driving', 'arrived_destination', 'completed', 'in_progress'].includes(ride.status)
    ? [ride.drop_lat, ride.drop_lng]
    : [ride.pickup_lat, ride.pickup_lng];
  points.push(targetPoint);

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* map */}
      <Card className="lg:col-span-2 !p-0 overflow-hidden relative">
        <div className="absolute top-4 left-4 z-[500] flex flex-col gap-2">
          <span className="pill bg-white/90 shadow-card text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500"/> Live · IIT Roorkee campus</span>
          <span className="pill bg-white/90 shadow-card muted">OpenStreetMap</span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 z-[500] card !py-3 !px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-brand grid place-items-center text-white"><Pin size={18}/></div>
            <div><div className="text-xs muted">Arriving in</div><div className="font-extrabold text-lg">{mm} min {ss}s</div></div>
          </div>
          <div className="text-right text-sm muted">
            {ride.status === 'driving' ? 'Heading to destination' : 'Driver en route'}<br/>
            <span className="text-ink dark:text-white font-semibold">{ride.vehicle_code} · moving</span>
          </div>
        </div>
        <MapContainer center={[ride.pickup_lat, ride.pickup_lng]} zoom={16} scrollWheelZoom style={{ height: 520 }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {pos && <Marker position={[pos.lat, pos.lng]} icon={driverIcon} />}
          <Marker position={[ride.pickup_lat, ride.pickup_lng]} icon={youIcon} />
          {pos && <Polyline positions={points} pathOptions={{ color: '#1487d6', weight: 4, dashArray: '2 8' }} />}
          <Recenter points={points} />
        </MapContainer>
      </Card>

      {/* side */}
      <div className="space-y-4">
        <Card>
          <StatusPill status={ride.status === 'in_progress' ? 'driving' : ride.status} />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <Avatar name={ride.driver_name || 'Driver'} color="bg-brand-100 text-brand-700" />
              <div><div className="font-extrabold">{ride.driver_name || 'Assigning…'}</div>
                <div className="text-sm muted">{ride.vehicle_code} · White e-rickshaw</div></div>
            </div>
            <div className="text-right"><div className="text-2xl font-extrabold">{mm}:{ss}</div><div className="text-xs muted">ETA</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button className="btn-ghost flex items-center justify-center gap-2"><Phone size={16}/> Call</button>
            <button className="btn-ghost flex items-center justify-center gap-2"><Chat size={16}/> Chat</button>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-lg mb-4">Ride status</h3>
          <div className="space-y-1">
            {STEPS.map(([key, label], i) => {
              const idx = ORDER.indexOf(key);
              const done = idx <= stage;
              const isLast = i === STEPS.length - 1;
              return (
                <div key={label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full grid place-items-center ${done ? 'gradient-brand text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                      {done ? <Check size={15}/> : <span className="w-2 h-2 rounded-full bg-current" />}
                    </div>
                    {!isLast && <div className={`w-0.5 flex-1 min-h-[26px] ${done ? 'bg-brand-300' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                  </div>
                  <div className="pb-3">
                    <div className={`font-semibold ${done ? '' : 'muted'}`}>{label}</div>
                            {key === 'en_route' && done && stage < 3 && <div className="text-xs text-brand-600">In progress · 1.2 km away</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
