// src/features/auth/pages/LandingPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BusFront, ArrowRight, MapPin, Zap, ShieldCheck, Star,
  Clock, Navigation, Users, TrendingUp, ChevronRight,
  Download, Menu, X, Phone, Globe, Award, CheckCircle,
  Radio, BarChart3, Wifi, Bell
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ─── Floating live-tracking cards shown in the hero ───────────────────────────
const HeroCard: React.FC<{
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ className = '', children, style }) => (
  <div
    style={style}
    className={`absolute bg-white dark:bg-[#111918] border border-slate-200/80 dark:border-[#1D9E75]/20 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 p-4 ${className}`}
  >
    {children}
  </div>
);

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    const onScroll = () => setScrolled(window.scrollY > 20);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const stats = [
    { value: '120+', label: 'Active Routes' },
    { value: '4,800+', label: 'Daily Riders' },
    { value: '30s', label: 'GPS Refresh' },
    { value: '4.8★', label: 'Avg Rating' },
  ];

  const features = [
    {
      icon: <Navigation size={26} />,
      title: 'Live GPS Tracking',
      desc: 'Watch your matatu move in real-time on an accurate road-snapped map. No guessing, no waiting in the dark.',
    },
    {
      icon: <Clock size={26} />,
      title: 'Precise ETAs',
      desc: 'Know to the minute when the next matatu reaches your stage — calculated from actual GPS position.',
    },
    {
      icon: <ShieldCheck size={26} />,
      title: 'Verified Drivers',
      desc: 'Every driver on Twende is verified with plate numbers and star ratings visible before you board.',
    },
    {
      icon: <Bell size={26} />,
      title: 'Arrival Alerts',
      desc: 'Get notified the moment your matatu is approaching so you never have to stare at the road again.',
    },
    {
      icon: <BarChart3 size={26} />,
      title: 'Route Analytics',
      desc: 'See live occupancy, peak hour patterns, and pick the fastest route to your destination.',
    },
    {
      icon: <Globe size={26} />,
      title: 'Nationwide Coverage',
      desc: 'From Nairobi CBD to Mombasa, Kisumu, and beyond — Twende covers routes across all major Kenyan cities.',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Pick Your Route',
      desc: 'Search for your stage or destination and select from active matatu routes near you.',
      icon: <MapPin size={22} />,
    },
    {
      num: '02',
      title: 'Track in Real-Time',
      desc: 'Watch your matatu\'s exact position on the live map. See the ETA countdown tick down.',
      icon: <Radio size={22} />,
    },
    {
      num: '03',
      title: 'Board with Confidence',
      desc: 'Arrive at the stage just in time. Check the driver rating and plate number before you step in.',
      icon: <CheckCircle size={22} />,
    },
  ];

  const testimonials = [
    {
      name: 'Amina W.',
      role: 'Passenger · Nairobi CBD',
      quote: 'I used to leave home 20 minutes early just to be safe. Now I check Twende and leave exactly when I need to.',
      rating: 5,
    },
    {
      name: 'James K.',
      role: 'Driver · Route 58',
      quote: 'Passengers who use Twende are always ready at the stage. Less time stopped, more trips in a day.',
      rating: 5,
    },
    {
      name: 'Faith M.',
      role: 'Passenger · Westlands',
      quote: 'The live map is incredibly accurate. I can see my matatu coming from two stops away. Absolutely love it.',
      rating: 5,
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

        .twende-land { font-family: 'DM Sans', sans-serif; }
        .twende-land h1, .twende-land h2, .twende-land h3, .twende-land .font-display {
          font-family: 'Syne', sans-serif;
        }

        @keyframes float-a {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-14px) rotate(1deg); }
        }
        @keyframes float-b {
          0%, 100% { transform: translateY(0px) rotate(1deg); }
          50% { transform: translateY(-10px) rotate(-1deg); }
        }
        @keyframes float-c {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.4); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .float-a { animation: float-a 6s ease-in-out infinite; }
        .float-b { animation: float-b 7s ease-in-out infinite 0.5s; }
        .float-c { animation: float-c 8s ease-in-out infinite 1s; }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }

        .hero-anim-1 { animation: slide-up 0.7s ease forwards; }
        .hero-anim-2 { animation: slide-up 0.7s ease 0.1s forwards; opacity: 0; }
        .hero-anim-3 { animation: slide-up 0.7s ease 0.2s forwards; opacity: 0; }
        .hero-anim-4 { animation: slide-up 0.7s ease 0.35s forwards; opacity: 0; }

        .shimmer-text {
          background: linear-gradient(90deg, #1D9E75 0%, #34d399 40%, #1D9E75 60%, #059669 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }

        .ticker-track { animation: ticker 28s linear infinite; }

        .feature-card:hover .feature-icon {
          background-color: #1D9E75;
          color: white;
          transform: scale(1.1);
        }
        .feature-icon { transition: all 0.25s ease; }

        .step-line::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 100%;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, #1D9E75, transparent);
          transform: translateY(-50%);
        }

        .glow-btn:hover {
          box-shadow: 0 0 32px rgba(29,158,117,0.45);
        }

        html.dark .hero-mesh {
          background: radial-gradient(ellipse 80% 60% at 60% 40%, rgba(29,158,117,0.12) 0%, transparent 70%),
                      radial-gradient(ellipse 50% 50% at 20% 80%, rgba(29,158,117,0.06) 0%, transparent 60%);
        }
        .hero-mesh {
          background: radial-gradient(ellipse 80% 60% at 60% 40%, rgba(29,158,117,0.07) 0%, transparent 70%),
                      radial-gradient(ellipse 50% 50% at 20% 80%, rgba(29,158,117,0.04) 0%, transparent 60%);
        }
      `}</style>

      <div className="twende-land min-h-screen bg-[#F7F8F6] dark:bg-[#080D0B] text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden">

        {/* ══════════════════════════════════════
            NAVIGATION
        ══════════════════════════════════════ */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 dark:bg-[#080D0B]/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/[0.06] shadow-sm'
            : 'bg-transparent'
        }`}>
          <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">

            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-9 h-9 bg-[#1D9E75] rounded-xl flex items-center justify-center shadow-lg shadow-[#1D9E75]/30">
                <BusFront className="text-white" size={20} strokeWidth={2.5} />
              </div>
              <span className="font-display text-xl font-bold tracking-tight">
                Twende<span className="text-[#1D9E75]">.</span>
              </span>
            </div>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
              <a href="#features" className="hover:text-[#1D9E75] transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-[#1D9E75] transition-colors">How It Works</a>
              <a href="#for-drivers" className="hover:text-[#1D9E75] transition-colors">For Drivers</a>
              <a href="#testimonials" className="hover:text-[#1D9E75] transition-colors">Reviews</a>
            </div>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-base"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register?role=passenger')}
                className="glow-btn px-5 py-2.5 bg-[#1D9E75] hover:bg-[#178562] text-white rounded-xl text-sm font-bold transition-all"
              >
                Get Started
              </button>
            </div>

            {/* Mobile hamburger */}
            <div className="md:hidden flex items-center gap-3">
              <button onClick={toggleTheme} className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-base">
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06]"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white dark:bg-[#0E1511] border-t border-slate-200 dark:border-white/[0.06] px-6 py-6 space-y-4">
              {['#features', '#how-it-works', '#for-drivers', '#testimonials'].map((href, i) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-slate-600 dark:text-slate-400 font-medium hover:text-[#1D9E75] py-1"
                >
                  {['Features', 'How It Works', 'For Drivers', 'Reviews'][i]}
                </a>
              ))}
              <div className="pt-4 flex flex-col gap-3">
                <button onClick={() => navigate('/login')} className="w-full py-3 border border-slate-200 dark:border-white/10 rounded-xl font-semibold text-sm">Sign In</button>
                <button onClick={() => navigate('/register?role=passenger')} className="w-full py-3 bg-[#1D9E75] text-white rounded-xl font-bold text-sm">Get Started Free</button>
              </div>
            </div>
          )}
        </nav>

        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden hero-mesh">

          {/* Background orbs */}
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#1D9E75] opacity-[0.06] blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-emerald-400 opacity-[0.04] blur-[80px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: copy */}
            <div>
              <div className="hero-anim-1 inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/25 text-[#1D9E75] text-xs font-bold tracking-widest uppercase">
                <span className="pulse-dot w-2 h-2 rounded-full bg-[#1D9E75] inline-block" />
                Live GPS · Kenya-wide
              </div>

              <h1 className="hero-anim-2 text-5xl md:text-[64px] leading-[1.05] font-bold tracking-tight mb-6">
                Always know
                <br />
                where your
                <br />
                <span className="shimmer-text">matatu is.</span>
              </h1>

              <p className="hero-anim-3 text-lg text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed mb-10">
                Twende is Kenya's premier matatu tracking platform. Real-time GPS, precise arrival times, and verified drivers — so you board with complete confidence.
              </p>

              <div className="hero-anim-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/register?role=passenger')}
                  className="glow-btn group flex items-center justify-center gap-2 px-7 py-4 bg-[#1D9E75] hover:bg-[#178562] text-white rounded-2xl font-bold text-base transition-all shadow-xl shadow-[#1D9E75]/25"
                >
                  Start Tracking Free
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>

                {installPrompt && !installed && (
                  <button
                    onClick={handleInstall}
                    className="flex items-center justify-center gap-2 px-7 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-base transition-all hover:opacity-90 shadow-lg"
                  >
                    <Download size={18} />
                    Install App
                  </button>
                )}

                {!installPrompt && !installed && (
                  <button
                    onClick={() => navigate('/login')}
                    className="flex items-center justify-center gap-2 px-7 py-4 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-base hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                  >
                    Sign In
                    <ChevronRight size={18} />
                  </button>
                )}

                {installed && (
                  <div className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-[#1D9E75] font-semibold text-sm">
                    <CheckCircle size={18} />
                    App installed
                  </div>
                )}
              </div>

              {/* Trust line */}
              <div className="mt-10 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-500">
                <div className="flex -space-x-2">
                  {['🧑🏾', '👩🏽', '👨🏿', '👩🏾'].map((e, i) => (
                    <span key={i} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm border-2 border-white dark:border-[#080D0B]">{e}</span>
                  ))}
                </div>
                <span><strong className="text-slate-700 dark:text-slate-300">4,800+</strong> Kenyans tracking daily</span>
              </div>
            </div>

            {/* Right: floating mockup cards */}
            <div className="hidden lg:block relative h-[520px]">

              {/* Main card */}
              <HeroCard className="float-a top-8 left-8 right-8 z-10" style={{ minWidth: 300 }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Route 58 · Westlands</p>
                    <p className="font-display text-xl font-bold text-slate-900 dark:text-white">Westlands → CBD</p>
                  </div>
                  <div className="w-10 h-10 bg-[#1D9E75]/10 rounded-xl flex items-center justify-center">
                    <BusFront size={20} className="text-[#1D9E75]" />
                  </div>
                </div>
                {/* Fake map strip */}
                <div className="w-full h-28 rounded-xl bg-slate-100 dark:bg-[#1A231F] relative overflow-hidden mb-4">
                  <div className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(29,158,117,0.15) 20px, rgba(29,158,117,0.15) 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(29,158,117,0.15) 20px, rgba(29,158,117,0.15) 21px)'
                    }}
                  />
                  {/* Route line */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 110">
                    <path d="M 20 80 Q 80 40 150 55 T 280 30" stroke="#1D9E75" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <circle cx="150" cy="55" r="6" fill="#1D9E75" />
                    <circle cx="150" cy="55" r="11" fill="#1D9E75" fillOpacity="0.25" />
                  </svg>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Clock size={15} className="text-[#1D9E75]" />
                    Arriving in <span className="text-[#1D9E75] font-bold text-base ml-1">4 min</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 dark:bg-[#1D9E75]/15 text-[#1D9E75] rounded-lg text-xs font-bold">LIVE</span>
                </div>
              </HeroCard>

              {/* Driver badge */}
              <HeroCard className="float-b bottom-20 left-0 z-20" style={{ width: 220 }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center text-xl">🧑🏾</div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Verified Driver</p>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">John M.</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} size={10} className="fill-amber-400 text-amber-400" />)}
                      <span className="text-xs text-slate-500 ml-1">4.9</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 px-2.5 py-1.5 bg-slate-50 dark:bg-white/[0.04] rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 tracking-widest">
                  KCB 823G
                </div>
              </HeroCard>

              {/* Alert badge */}
              <HeroCard className="float-c bottom-8 right-0 z-20" style={{ width: 200 }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-[#1D9E75]/15 flex items-center justify-center">
                    <Bell size={15} className="text-[#1D9E75]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Matatu Nearby</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">2 stops away · head out</p>
                  </div>
                </div>
              </HeroCard>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            STATS TICKER
        ══════════════════════════════════════ */}
        <div className="border-y border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0C1210] overflow-hidden py-5">
          <div className="flex ticker-track whitespace-nowrap">
            {[...stats, ...stats, ...stats, ...stats].map((s, i) => (
              <div key={i} className="inline-flex items-center gap-10 mx-10">
                <span className="font-display text-2xl font-bold text-[#1D9E75]">{s.value}</span>
                <span className="text-slate-500 dark:text-slate-500 text-sm font-medium uppercase tracking-widest">{s.label}</span>
                <span className="text-slate-200 dark:text-white/[0.08] text-2xl select-none">·</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════
            FEATURES
        ══════════════════════════════════════ */}
        <section id="features" className="py-28 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[#1D9E75] text-xs font-bold tracking-[0.2em] uppercase mb-3">What We Offer</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Built for Kenyan
                <br />
                <span className="shimmer-text">commuters first.</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg">
                Every feature is designed around the reality of matatu travel in Kenya — not copied from somewhere else.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="feature-card group p-7 rounded-2xl bg-white dark:bg-[#0E1511] border border-slate-200/80 dark:border-white/[0.05] hover:border-[#1D9E75]/40 dark:hover:border-[#1D9E75]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#1D9E75]/5 cursor-default"
                >
                  <div className="feature-icon w-12 h-12 rounded-2xl bg-[#1D9E75]/10 dark:bg-[#1D9E75]/10 text-[#1D9E75] flex items-center justify-center mb-5">
                    {f.icon}
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2 text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════ */}
        <section id="how-it-works" className="py-28 px-6 bg-slate-50/70 dark:bg-[#0A0F0C]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[#1D9E75] text-xs font-bold tracking-[0.2em] uppercase mb-3">Simple Process</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Up and running
                <br />in <span className="shimmer-text">three steps.</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {steps.map((s, i) => (
                <div key={i} className="relative">
                  {/* Connector line between steps */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-[calc(50%+48px)] right-[-50%] h-px bg-gradient-to-r from-[#1D9E75]/40 to-transparent z-0" />
                  )}

                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-3xl bg-[#1D9E75] flex items-center justify-center text-white shadow-xl shadow-[#1D9E75]/30">
                        {s.icon}
                      </div>
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-display font-bold">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold mb-3 text-slate-900 dark:text-white">{s.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-14 text-center">
              <button
                onClick={() => navigate('/register?role=passenger')}
                className="glow-btn inline-flex items-center gap-2 px-8 py-4 bg-[#1D9E75] hover:bg-[#178562] text-white rounded-2xl font-bold text-base transition-all shadow-xl shadow-[#1D9E75]/25"
              >
                Try It Now — It's Free
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FOR DRIVERS
        ══════════════════════════════════════ */}
        <section id="for-drivers" className="py-28 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-3xl bg-slate-900 dark:bg-[#0E1511] border border-white/[0.07] overflow-hidden grid lg:grid-cols-2 gap-0">

              {/* Left: dark content */}
              <div className="p-12 lg:p-16 flex flex-col justify-center">
                <p className="text-[#1D9E75] text-xs font-bold tracking-[0.2em] uppercase mb-4">For Drivers</p>
                <h2 className="font-display text-4xl font-bold text-white tracking-tight mb-6">
                  Grow your
                  <br />
                  <span className="shimmer-text">passenger base.</span>
                </h2>
                <p className="text-white/60 text-base leading-relaxed mb-8">
                  Join Twende as a driver and get discovered by thousands of passengers looking for your route every day. Build your rating, earn trust, and run more efficient trips.
                </p>

                <div className="space-y-4 mb-10">
                  {[
                    { icon: <Users size={18} />, text: 'Passengers arrive at the stage ready to board' },
                    { icon: <TrendingUp size={18} />, text: 'Build your rating and attract more loyal riders' },
                    { icon: <Award size={18} />, text: 'Verified badge increases passenger confidence' },
                    { icon: <BarChart3 size={18} />, text: 'See your trip history and performance stats' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-white/80 text-sm font-medium">
                      <div className="w-8 h-8 rounded-xl bg-[#1D9E75]/20 text-[#1D9E75] flex items-center justify-center shrink-0">
                        {item.icon}
                      </div>
                      {item.text}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate('/register?role=driver')}
                  className="glow-btn self-start flex items-center gap-2 px-7 py-4 bg-[#1D9E75] hover:bg-[#178562] text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-[#1D9E75]/30"
                >
                  Register as a Driver
                  <ArrowRight size={17} />
                </button>
              </div>

              {/* Right: decorative driver card */}
              <div className="relative bg-[#1D9E75]/5 flex items-center justify-center p-12 min-h-[340px]">
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(29,158,117,0.5) 20px, rgba(29,158,117,0.5) 21px)'
                  }}
                />
                <div className="relative z-10 bg-white dark:bg-[#111918] rounded-3xl p-7 shadow-2xl w-full max-w-xs">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#1D9E75]/10 flex items-center justify-center text-3xl">🚌</div>
                    <div>
                      <p className="font-display font-bold text-slate-900 dark:text-white text-lg">James K.</p>
                      <p className="text-slate-500 text-sm">Route 58 · Westlands</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { label: 'Total Trips', val: '1,240' },
                      { label: 'Avg Rating', val: '4.9★' },
                      { label: 'On-Time', val: '96%' },
                      { label: 'Passengers', val: '8.4k' },
                    ].map((s, i) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-white/[0.04] rounded-xl">
                        <p className="font-display font-bold text-slate-900 dark:text-white text-lg">{s.val}</p>
                        <p className="text-xs text-slate-400">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="pulse-dot w-2 h-2 rounded-full bg-[#1D9E75]" />
                    <p className="text-xs font-bold text-[#1D9E75]">Currently on trip</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            TESTIMONIALS
        ══════════════════════════════════════ */}
        <section id="testimonials" className="py-28 px-6 bg-slate-50/70 dark:bg-[#0A0F0C]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[#1D9E75] text-xs font-bold tracking-[0.2em] uppercase mb-3">Real Riders</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Loved across
                <br />
                <span className="shimmer-text">Kenya.</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <div key={i} className="p-7 bg-white dark:bg-[#0E1511] border border-slate-200/80 dark:border-white/[0.05] rounded-2xl flex flex-col gap-5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} size={15} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed flex-1">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
                    <div className="w-9 h-9 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center text-lg">
                      {['🧕🏽', '👨🏿', '👩🏾'][i]}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CTA BANNER
        ══════════════════════════════════════ */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="relative rounded-3xl bg-[#1D9E75] p-16 overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-black/10" />

              <div className="relative z-10">
                <p className="text-white/70 text-xs font-bold tracking-[0.2em] uppercase mb-4">Get Started Today</p>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight mb-5">
                  Stop guessing.
                  <br />Start tracking.
                </h2>
                <p className="text-white/80 text-lg mb-10 max-w-lg mx-auto">
                  Join thousands of Kenyans who already know exactly when their matatu arrives.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => navigate('/register?role=passenger')}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#1D9E75] rounded-2xl font-bold text-base hover:bg-slate-50 transition-all shadow-xl"
                  >
                    Create Free Account
                    <ArrowRight size={18} />
                  </button>

                  {installPrompt && !installed && (
                    <button
                      onClick={handleInstall}
                      className="flex items-center justify-center gap-2 px-8 py-4 bg-black/20 hover:bg-black/30 text-white rounded-2xl font-bold text-base transition-all border border-white/20"
                    >
                      <Download size={18} />
                      Install App
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FOOTER
        ══════════════════════════════════════ */}
        <footer className="border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0C1210] px-6 py-16">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-[#1D9E75] rounded-xl flex items-center justify-center">
                  <BusFront className="text-white" size={16} strokeWidth={2.5} />
                </div>
                <span className="font-display text-lg font-bold">
                  Twende<span className="text-[#1D9E75]">.</span>
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-[200px]">
                Real-time matatu tracking for every Kenyan commuter.
              </p>
            </div>

            {/* Links */}
            {[
              {
                heading: 'Product',
                links: ['Features', 'How It Works', 'For Drivers', 'Reviews'],
              },
              {
                heading: 'Account',
                links: ['Sign In', 'Register', 'Driver Portal', 'Help Centre'],
              },
              {
                heading: 'Company',
                links: ['About', 'Careers', 'Privacy Policy', 'Terms of Use'],
              },
            ].map((col) => (
              <div key={col.heading}>
                <p className="font-display font-bold text-slate-900 dark:text-white text-sm mb-4 uppercase tracking-wider">{col.heading}</p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-slate-500 dark:text-slate-400 text-sm hover:text-[#1D9E75] transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-xs">
              © 2026 Twende Platform Ltd. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Made with</span>
              <span className="text-[#1D9E75]">♥</span>
              <span>in Nairobi, Kenya</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;