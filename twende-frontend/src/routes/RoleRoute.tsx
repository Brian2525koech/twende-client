import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BusFront } from 'lucide-react';

// A fixed full-screen splash that covers EVERYTHING during any intermediate state.
// "position: fixed + inset-0 + z-[9999]" means no underlying page can bleed through,
// which is exactly what was causing the cracked-screen composite glitch on mobile.
const Splash: React.FC = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F7F8F6] dark:bg-[#080D0B]">
    <div className="w-14 h-14 bg-[#1D9E75] rounded-2xl flex items-center justify-center shadow-xl shadow-[#1D9E75]/30">
      <BusFront className="text-white" size={26} strokeWidth={2.5} />
    </div>
    <div className="mt-5 flex gap-2">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-[#1D9E75]"
          style={{ animation: `td-dot 1s ease-in-out ${i * 0.18}s infinite` }}
        />
      ))}
    </div>
    <style>{`
      @keyframes td-dot {
        0%, 100% { transform: translateY(0px); opacity: 0.3; }
        50%       { transform: translateY(-7px); opacity: 1; }
      }
    `}</style>
  </div>
);

const roleHome: Record<string, string> = {
  driver:    '/driver/dashboard',
  admin:     '/admin',
  passenger: '/home',
};

const RoleRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  // CASE 1 — AuthContext is still reading localStorage. Show splash, render NOTHING else.
  // CASE 2 — Token exists but user object hasn't been set yet (was "return null" — the crash culprit).
  // Both cases must show the same opaque Splash so zero underlying content can composite through.
  if (loading || (token && !user)) {
    return <Splash />;
  }

  // CASE 3 — No token at all. Definitely logged out.
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // CASE 4 — Logged in but wrong role (e.g. driver hitting /home).
  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHome[user.role] ?? '/login'} replace />;
  }

  // CASE 5 — Authenticated and correct role. Render the page.
  return <Outlet />;
};

export default RoleRoute;