import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BusFront, ArrowRight, Map, Zap, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    // We use "bg-white dark:bg-slate-950" to ensure the background changes
    <div className="min-h-screen w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* --- NAVIGATION --- */}
      <nav className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1D9E75] rounded-xl flex items-center justify-center">
              <BusFront className="text-white" size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase">
              Twende<span className="text-[#1D9E75]">.</span>
            </span>
          </div>

          <button 
            onClick={toggleTheme}
            className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <div className="mb-8 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-[#1D9E75] font-bold text-sm">
          Live GPS Tracking for Kenyan Matatus
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight">
          Track your ride in <br />
          <span className="text-[#1D9E75]">Real-Time.</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-12">
          Stop waiting blindly at the stage. Twende shows you exactly where your matatu is and when it will arrive.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button 
            onClick={() => navigate('/register?role=passenger')}
            className="flex-1 px-8 py-4 bg-[#1D9E75] hover:bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2"
          >
            Track Matatu <ArrowRight size={20} />
          </button>
          <button 
            onClick={() => navigate('/register?role=driver')}
            className="flex-1 px-8 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-bold text-lg"
          >
            Drive with Us
          </button>
        </div>
      </main>

      {/* --- FEATURES --- */}
      <section className="bg-slate-50 dark:bg-slate-900/50 py-24 px-6 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mb-6">
              <Map className="text-[#1D9E75]" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-3">Live Map</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Watch your matatu move smoothly along the highway with road-snapped GPS accuracy.</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mb-6">
              <Zap className="text-[#1D9E75]" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant ETAs</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Know exactly how many minutes until the next matatu reaches your current stage.</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mb-6">
              <ShieldCheck className="text-[#1D9E75]" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-3">Verified Drivers</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">View plate numbers and driver ratings to ensure you board a safe and reliable matatu.</p>
          </div>
        </div>
      </section>

      <footer className="py-12 text-center text-slate-500 text-sm italic">
        © 2026 Twende Platform. Professional transit solutions for Kenya.
      </footer>
    </div>
  );
};

export default LandingPage;