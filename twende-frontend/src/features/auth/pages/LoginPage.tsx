// src/features/pages/LoginPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BusFront,
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
} from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import toast from "react-hot-toast";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = toast.loading("Verifying credentials...");

    try {
      const response = await api.post("/auth/login", formData);

      // 1. Update Auth State
      login(response.data.token, response.data.user);

      toast.success("Welcome back!", { id: loadingToast });

      // 2. Clean role-based redirect (this is the improved part)
      setTimeout(() => {
        const role = response.data.user.role?.toLowerCase(); // safe + case-insensitive

        // ←───── THIS IS THE CLEAN PART ──────
        const roleRoutes: Record<string, string> = {
          admin: "/admin", // ← your admin dashboard
          driver: "/driver/dashboard",
          // Add more roles here in the future (e.g. "superadmin", "support", etc.)
        };

        const targetRoute = roleRoutes[role] || "/home";

        navigate(targetRoute, { replace: true });
      }, 200);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Login failed. Check your credentials.",
        { id: loadingToast },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="twende-font min-h-screen bg-[#F5F5F0] dark:bg-[#0A0F0D] flex transition-colors duration-500">
      {/* ─── LEFT PANEL (decorative, hidden on mobile) ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden twende-auth-panel flex-col items-start justify-between p-14">
        {/* Grid pattern */}
        <div className="twende-auth-grid absolute inset-0" />
        {/* Green glow */}
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#1D9E75] rounded-full opacity-20 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-64 h-64 bg-[#1D9E75] rounded-full opacity-10 blur-[80px] pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 bg-[#1D9E75] rounded-xl flex items-center justify-center shadow-lg">
            <BusFront className="text-white" size={22} strokeWidth={2.5} />
          </div>
          <span className="text-white text-xl font-black tracking-[-0.04em] uppercase">
            TWENDE<span className="text-[#1D9E75]">.</span>
          </span>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <p className="text-[#1D9E75] text-xs font-bold tracking-[0.2em] uppercase mb-4">
            Live GPS · Nairobi
          </p>
          <h2 className="text-white text-4xl font-black leading-tight tracking-[-0.03em] mb-4">
            Know exactly
            <br />
            when your
            <br />
            <span className="text-[#1D9E75]">matatu arrives.</span>
          </h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs">
            Real-time tracking, verified drivers, and instant ETAs — all in one
            platform built for Nairobi.
          </p>

          {/* Stats row */}
          <div className="flex gap-8 mt-10">
            {[
              ["120+", "Routes"],
              ["30s", "Updates"],
              ["4.8★", "Rating"],
            ].map(([val, label]) => (
              <div key={label}>
                <div className="text-[#1D9E75] text-xl font-black">{val}</div>
                <div className="text-white/40 text-xs font-medium uppercase tracking-wider">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL (form) ─── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12 relative">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-black/[0.06] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-all"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun size={15} className="text-amber-400" strokeWidth={2.5} />
          ) : (
            <Moon size={15} className="text-slate-500" strokeWidth={2.5} />
          )}
        </button>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-10">
            <div className="w-9 h-9 bg-[#1D9E75] rounded-xl flex items-center justify-center">
              <BusFront className="text-white" size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[#0A0F0D] dark:text-white text-lg font-black tracking-[-0.04em] uppercase">
              TWENDE<span className="text-[#1D9E75]">.</span>
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-[#0A0F0D] dark:text-white tracking-[-0.03em] mb-1">
              Welcome back
            </h1>
            <p className="text-[#0A0F0D]/50 dark:text-white/50 text-sm font-medium">
              Sign in to continue to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div
              className={`twende-auth-field ${focused === "email" ? "twende-auth-field-focused" : ""}`}
            >
              <Mail
                size={17}
                className={`twende-auth-icon ${focused === "email" || formData.email ? "twende-auth-icon-active" : ""}`}
                strokeWidth={2.5}
              />
              <input
                required
                type="email"
                placeholder="Email address"
                className="twende-auth-input"
                value={formData.email}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            {/* Password */}
            <div
              className={`twende-auth-field ${focused === "password" ? "twende-auth-field-focused" : ""}`}
            >
              <Lock
                size={17}
                className={`twende-auth-icon ${focused === "password" || formData.password ? "twende-auth-icon-active" : ""}`}
                strokeWidth={2.5}
              />
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="twende-auth-input"
                value={formData.password}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="twende-auth-eye"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={16} strokeWidth={2.5} />
                ) : (
                  <Eye size={16} strokeWidth={2.5} />
                )}
              </button>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-[#1D9E75] font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1D9E75] hover:bg-[#178562] disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-[#1D9E75]/25 mt-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#0A0F0D]/10 dark:bg-white/10" />
            <span className="text-[#0A0F0D]/30 dark:text-white/30 text-xs font-medium">
              OR
            </span>
            <div className="flex-1 h-px bg-[#0A0F0D]/10 dark:bg-white/10" />
          </div>

          <p className="text-center text-sm text-[#0A0F0D]/50 dark:text-white/50 font-medium">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-[#1D9E75] font-black hover:underline"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
