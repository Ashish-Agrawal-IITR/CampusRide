const BASE = import.meta.env.VITE_API_URL || '';

let token = localStorage.getItem('cr_token') || null;
export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('cr_token', t);
  else localStorage.removeItem('cr_token');
}
export function getToken() { return token; }

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  me: () => request('/auth/me'),
  // rides
  zones: () => request('/rides/zones'),
  quote: (pickup, drop, type) =>
    request(`/rides/quote?pickup=${encodeURIComponent(pickup)}&drop=${encodeURIComponent(drop)}&type=${type}`),
  activeRides: () => request('/rides/active'),
  myRides: () => request('/rides/mine'),
  openRides: () => request('/rides/open'),
  scheduledRides: () => request('/rides/scheduled'),
  ride: (id) => request(`/rides/${id}`),
  // drivers
  nearby: () => request('/drivers/nearby'),
  setAvailability: (online) => request('/drivers/availability', { method: 'PATCH', body: { online } }),
  driverDashboard: () => request('/drivers/me/dashboard'),
  // ratings
  rate: (body) => request('/ratings', { method: 'POST', body }),
  driverRatings: (id) => request(`/ratings/driver/${id}`),
  // payments
  pay: (rideId, method) => request('/payments', { method: 'POST', body: { rideId, method } }),
  // analytics
  overview: () => request('/analytics/overview'),
  peakHours: () => request('/analytics/peak-hours'),
  heatmap: () => request('/analytics/heatmap'),
  revenue: () => request('/analytics/revenue'),
  forecast: () => request('/analytics/forecast'),
};
