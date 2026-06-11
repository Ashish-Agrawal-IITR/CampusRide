// Approximate IIT Roorkee landmark coordinates used for the live map + dispatch.
export const CAMPUS = {
  center: { lat: 29.8650, lng: 77.8965 },
  zones: {
    'Main Gate':        { lat: 29.8642, lng: 77.8930 },
    'LHC':              { lat: 29.8651, lng: 77.8967 },   // Lecture Hall Complex
    'MAC':              { lat: 29.8669, lng: 77.8951 },   // Multi-Activity Centre
    'Bhawan Cluster':   { lat: 29.8688, lng: 77.8979 },
    'Rajendra Bhawan':  { lat: 29.8693, lng: 77.8985 },
    'Govind Bhawan':    { lat: 29.8701, lng: 77.8972 },
    'Cautley Bhawan':   { lat: 29.8679, lng: 77.8990 },
    'Library':          { lat: 29.8655, lng: 77.8958 },
    'PI Hostel':        { lat: 29.8628, lng: 77.8998 },
    'Tinkering Lab':    { lat: 29.8662, lng: 77.8942 },
    'Convocation':      { lat: 29.8635, lng: 77.8975 },
  },
};

export const ZONE_NAMES = Object.keys(CAMPUS.zones);

export function coordsFor(name) {
  return CAMPUS.zones[name] || CAMPUS.center;
}

// Haversine distance in km
export function distanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180, lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Flat campus pricing — no surge. Base + per-km, with a multiplier per ride type.
const BASE = 10, PER_KM = 8;
const TYPE_MULT = { solo: 1.0, share: 0.6, cargo: 1.6 };

export function estimateFare(pickup, drop, rideType = 'solo') {
  const d = distanceKm(coordsFor(pickup), coordsFor(drop));
  const raw = (BASE + d * PER_KM) * (TYPE_MULT[rideType] ?? 1);
  return Math.max(12, Math.round(raw));   // floor of ₹12 (matches landing page)
}

// ETA in seconds at ~18 km/h e-rickshaw speed, used for "pickup in X min".
export function etaSeconds(from, to) {
  const d = distanceKm(coordsFor(from), coordsFor(to));
  return Math.max(60, Math.round((d / 18) * 3600));
}
