import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/ui';
import { Car, Grid, Chart, Shield, Leaf, Star } from '../components/icons';

export default function Login() {
  const { login, register, demoLogin } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'passenger', vehicleCode: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const demo = async (role) => { setBusy(true); setErr(''); try { await demoLogin(role); } catch (e) { setErr(e.message); } finally { setBusy(false); } };

  return (
    <div className="min-h-full grid lg:grid-cols-2">
      {/* left hero */}
      <div className="hidden lg:flex flex-col justify-between p-12 gradient-brand text-white relative overflow-hidden">
        <div className="relative z-10"><Logo /></div>
        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold leading-tight">Campus rides,<br/>in seconds.</h1>
          <p className="mt-4 text-white/85 max-w-md">
            Connecting IIT Roorkee students with verified e-rickshaw drivers — real-time, fair-priced, 100% electric.
          </p>
          <div className="flex gap-6 mt-8 text-sm font-semibold">
            <span className="flex items-center gap-2"><Shield size={18}/> Verified drivers</span>
            <span className="flex items-center gap-2"><Star size={18} filled/> 4.9 rating</span>
            <span className="flex items-center gap-2"><Leaf size={18}/> 100% EV</span>
          </div>
        </div>
        <div className="relative z-10 text-white/70 text-sm">© CampusRide · IIT Roorkee</div>
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-white/10" />
        <div className="absolute right-16 top-16 w-40 h-40 rounded-full bg-white/10" />
      </div>

      {/* right form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6"><Logo /></div>
          <h2 className="text-3xl font-extrabold text-ink dark:text-white">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="muted mt-1">{mode === 'login' ? 'Log in to book and track rides.' : 'Join CampusRide as a rider or driver.'}</p>

          <div className="grid grid-cols-3 gap-2 mt-6">
            <DemoBtn icon={Grid} label="Passenger" onClick={() => demo('passenger')} disabled={busy} />
            <DemoBtn icon={Car} label="Driver" onClick={() => demo('driver')} disabled={busy} />
            <DemoBtn icon={Chart} label="Admin" onClick={() => demo('admin')} disabled={busy} />
          </div>
          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
            <span className="text-xs muted font-semibold">or use email</span>
            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <Input placeholder="Full name" value={form.name} onChange={set('name')} required />
            )}
            <Input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
            <Input type="password" placeholder="Password" value={form.password} onChange={set('password')} required />
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <select value={form.role} onChange={set('role')}
                  className="w-full rounded-xl2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 px-4 py-3 font-medium">
                  <option value="passenger">Passenger</option>
                  <option value="driver">Driver</option>
                  <option value="admin">Admin</option>
                </select>
                {form.role === 'driver' && (
                  <Input placeholder="Vehicle (e.g. EV-12)" value={form.vehicleCode} onChange={set('vehicleCode')} />
                )}
              </div>
            )}
            {err && <div className="text-rose-500 text-sm font-medium">{err}</div>}
            <button className="btn-primary w-full !py-3" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          <p className="text-sm muted mt-5 text-center">
            {mode === 'login' ? "New here? " : 'Already have an account? '}
            <button className="text-brand-600 font-semibold"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
              {mode === 'login' ? 'Create an account' : 'Log in'}
            </button>
          </p>
          <p className="text-xs muted mt-2 text-center">Demo password for all seeded accounts: <code>password123</code></p>
        </div>
      </div>
    </div>
  );
}

const Input = (p) => (
  <input {...p} className="w-full rounded-xl2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-brand-300" />
);

function DemoBtn({ icon: Icon, label, ...p }) {
  return (
    <button type="button" {...p}
      className="flex flex-col items-center gap-1.5 py-3 rounded-xl2 border border-slate-200 dark:border-slate-700 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 transition disabled:opacity-50">
      <Icon size={22} className="text-brand-500" />
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
