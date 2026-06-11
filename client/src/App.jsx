import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Home from './pages/Home';
import Passenger from './pages/Passenger';
import Driver from './pages/Driver';
import Tracking from './pages/Tracking';
import Admin from './pages/Admin';

function Shell({ children }) {
  return (
    <div className="min-h-full">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-full grid place-items-center">
        <div className="animate-pulse text-slate-400 font-semibold">Loading CampusRide…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/passenger" element={<Passenger />} />
        <Route path="/driver" element={<Driver />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/tracking/:rideId" element={<Tracking />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
