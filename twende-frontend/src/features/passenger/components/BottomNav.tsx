// src/features/passenger/components/BottomNav.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Map, Clock7, Bell, User } from 'lucide-react';
// 1. Import the hook (adjust path as needed)
import { useNotifications } from '../pages/NotificationPages/useNotifications';
// 2. Import your auth hook to get the logged-in user's ID
import { useAuth } from '@/contexts/AuthContext'; 

const tabs = [
  { icon: Map, label: 'Explore', path: '/home' },
  { icon: Clock7, label: 'Trips', path: '/trips' },
  { icon: Bell, label: 'Alerts', path: '/notifications' },
  { icon: User, label: 'Profile', path: '/profile' },
];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Get current user
  
  // 3. Get the unread count from our hook
  const { unreadCount } = useNotifications(user?.id);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5 pt-2 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="bg-white dark:bg-[#111816] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] px-2 py-2 flex items-center justify-around shadow-2xl shadow-black/10 dark:shadow-black/40">
          {tabs.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path;
            const isAlerts = label === 'Alerts';

            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center gap-1 px-5 py-2.5 rounded-[1.25rem] transition-all duration-200 ${
                  active
                    ? 'bg-[#1D9E75]/10 text-[#1D9E75]'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {/* 4. Wrap the Icon in a relative div for the badge */}
                <div className="relative">
                  <Icon
                    size={21}
                    strokeWidth={active ? 2.5 : 2}
                    className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}
                  />
                  
                  {/* 5. The Red Badge */}
                  {isAlerts && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#111816]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>

                <span className={`text-[10px] font-bold tracking-wide uppercase ${active ? 'text-[#1D9E75]' : ''}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;