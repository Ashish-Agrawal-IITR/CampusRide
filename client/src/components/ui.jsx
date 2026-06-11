import { Star } from './icons';

export function Logo({ compact }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl2 gradient-brand grid place-items-center shadow-card">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 16h14M6.5 16L8 11h8l1.5 5M4 13h2m12 0h2"/>
          <circle cx="8" cy="16.5" r="1.4"/><circle cx="16" cy="16.5" r="1.4"/>
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-extrabold text-lg text-ink dark:text-white">CampusRide</div>
          <div className="text-[10px] font-bold tracking-[0.2em] text-slate-400">IIT ROORKEE</div>
        </div>
      )}
    </div>
  );
}

export function Card({ className = '', children }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

const deltaColor = (d) => (d?.startsWith('-') ? 'text-rose-500' : 'text-emerald-500');

export function StatCard({ icon: Icon, value, label, delta }) {
  return (
    <Card className="!p-5">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl2 gradient-brand grid place-items-center text-white">
          <Icon size={20} />
        </div>
        {delta && <span className={`text-sm font-semibold ${deltaColor(delta)}`}>{delta}</span>}
      </div>
      <div className="stat-num mt-4">{value}</div>
      <div className="muted text-sm mt-1">{label}</div>
    </Card>
  );
}

const STATUS = {
  requested:   ['bg-amber-100 text-amber-700', 'Requested'],
  accepted:    ['bg-brand-100 text-brand-700', 'Accepted'],
  en_route:            ['bg-emerald-100 text-emerald-700', 'Driver en route'],
  arrived:             ['bg-brand-100 text-brand-700', 'Arrived at pickup'],
  picked_up:           ['bg-teal-100 text-teal-700', 'Passenger picked up'],
  driving:             ['bg-emerald-100 text-emerald-700', 'Driving to destination'],
  arrived_destination: ['bg-brand-100 text-brand-700', 'Arrived at destination'],
  in_progress:         ['bg-teal-100 text-teal-700', 'On trip'],
  completed:           ['bg-emerald-100 text-emerald-700', 'Drop completed'],
  cancelled:   ['bg-slate-200 text-slate-600', 'Cancelled'],
};
export function StatusPill({ status }) {
  const [cls, label] = STATUS[status] || ['bg-slate-100 text-slate-600', status];
  return <span className={`pill ${cls}`}>{label}</span>;
}

export function Stars({ value = 0, size = 16, className = '' }) {
  return (
    <span className={`inline-flex text-amber-400 ${className}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} filled={i <= Math.round(value)} />
      ))}
    </span>
  );
}

export function Avatar({ name, color = 'bg-brand-100 text-brand-700' }) {
  const initials = (name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('');
  return (
    <div className={`w-12 h-12 rounded-full grid place-items-center font-bold ${color}`}>
      {initials}
    </div>
  );
}

export function SectionTitle({ kicker, title, right }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        {kicker && <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">{kicker}</div>}
        <h2 className="text-2xl font-extrabold text-ink dark:text-white">{title}</h2>
      </div>
      {right}
    </div>
  );
}
