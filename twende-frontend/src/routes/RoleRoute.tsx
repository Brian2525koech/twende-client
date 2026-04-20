// src/routes/RoleRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const RoleRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();
  const hasLocalToken = localStorage.getItem('twende_token');

  // 1. If the AuthProvider is still reading from localStorage, show a loader
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1D9E75]"></div>
      </div>
    );
  }

  // 2. If no token in state AND no token in storage, they are definitely logged out
  if (!token && !hasLocalToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If we have a token but the user object hasn't finished parsing yet, wait
  if (hasLocalToken && !user) {
    return null; 
  }

  // 4. If the user is logged in but has the wrong role (e.g., driver trying to access passenger home)
  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // 5. Everything is correct, render the page
  return <Outlet />;
};

export default RoleRoute;