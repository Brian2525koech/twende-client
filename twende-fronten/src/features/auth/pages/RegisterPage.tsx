// src/features/pages/RegisterPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BusFront,
  User,
  Mail,
  Lock,
  CreditCard,
  MapPin,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  CheckCircle2,
} from "lucide-react";
import { fetchAllRoutes } from "@/lib/api/routesApi";
import api from "@/lib/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { Route } from "@/types";
import toast from "react-hot-toast";

const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const initialRole =
    (searchParams.get("role") as "passenger" | "driver") || "passenger";
  const [role, setRole] = useState<"passenger" | "driver">(initialRole);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingRoutes, setFetchingRoutes] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    plate_number: "",
    route_id: "",
  });

  // Password strength indicator
  const getPasswordStrength = (pw: string) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };
  const strength = getPasswordStrength(formData.password);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = [
    "",
    "twende-strength-weak",
    "twende-strength-fair",
    "twende-strength-good",
    "twende-strength-strong",
  ][strength];

  useEffect(() => {
    if (role === "driver") {
      const loadRoutes = async () => {
        setFetchingRoutes(true);
        try {
          const data = await fetchAllRoutes();
          setRoutes(data);
        } catch (err) {
          console.error("Failed to load routes", err);
        } finally {
          setFetchingRoutes(false);
        }
      };
      loadRoutes();
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = toast.loading("Setting up your account...");
    try {
      const payload = {
        ...formData,
        role,
        route_id: role === "driver" ? parseInt(formData.route_id) : undefined,
      };
      const response = await api.post("/auth/register", payload);

      // 1. Update Auth State
      login(response.data.token, response.data.user);

      toast.success("Account created successfully!", { id: loadingToast });

      // 2. Added delay to ensure AuthContext state is propagated before navigation
      setTimeout(() => {
        navigate(role === "driver" ? "/driver/dashboard" : "/home", {
          replace: true,
        });
      }, 200);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Registration failed. Check your connection.",
        { id: loadingToast },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="twende-font min-h-screen bg-[#F5F5F0] dark:bg-[#0A0F0D] flex transition-colors duration-500">
      {/* ─── LEFT PANEL ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden twende-auth-panel flex-col items-start justify-between p-14">
        <div className="twende-auth-grid absolute inset-0" />
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

        {/* Perks list */}
        <div className="relative z-10">
          <p className="text-[#1D9E75] text-xs font-bold tracking-[0.2em] uppercase mb-4">
            Why join Twende?
          </p>
          <h2 className="text-white text-4xl font-black leading-tight tracking-[-0.03em] mb-8">
            Smarter transit
            <br />
            starts <span className="text-[#1D9E75]">here.</span>
          </h2>

          <div className="space-y-4">
            {[
              "Live GPS positions updated every 30 seconds",
              "Countdown ETAs to your exact stage",
              "Verified driver plates and ratings",
              "Works across 120+ Nairobi routes",
            ].map((perk) => (
              <div key={perk} className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  className="text-[#1D9E75] mt-0.5 shrink-0"
                  strokeWidth={2.5}
                />
                <span className="text-white/70 text-sm leading-relaxed">
                  {perk}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12 relative overflow-y-auto">
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
          <div className="mb-7">
            <h1 className="text-3xl font-black text-[#0A0F0D] dark:text-white tracking-[-0.03em] mb-1">
              Create account
            </h1>
            <p className="text-[#0A0F0D]/50 dark:text-white/50 text-sm font-medium">
              Join thousands of Nairobians on Twende
            </p>
          </div>

          {/* Role toggle */}
          <div className="flex p-1 bg-[#0A0F0D]/06 dark:bg-white/06 rounded-2xl mb-6 border border-[#0A0F0D]/08 dark:border-white/08">
            {(["passenger", "driver"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm capitalize transition-all duration-200 ${
                  role === r
                    ? "bg-white dark:bg-[#1a1a1a] text-[#1D9E75] shadow-sm"
                    : "text-[#0A0F0D]/40 dark:text-white/40 hover:text-[#0A0F0D]/70 dark:hover:text-white/70"
                }`}
              >
                {r === "passenger" ? "🧍 Passenger" : "🚌 Driver"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Full Name */}
            <div
              className={`twende-auth-field ${focused === "name" ? "twende-auth-field-focused" : ""}`}
            >
              <User
                size={17}
                className={`twende-auth-icon ${focused === "name" || formData.name ? "twende-auth-icon-active" : ""}`}
                strokeWidth={2.5}
              />
              <input
                required
                type="text"
                placeholder="Full name"
                className="twende-auth-input"
                value={formData.name}
                onFocus={() => setFocused("name")}
                onBlur={() => setFocused(null)}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

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
            <div>
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

              {/* Password strength bar */}
              {formData.password && (
                <div className="mt-2 px-1">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= strength
                            ? strengthColor
                            : "bg-[#0A0F0D]/10 dark:bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-semibold ${strengthColor}`}>
                    {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            {/* Driver-only fields */}
            {role === "driver" && (
              <div className="pt-3 space-y-3 border-t border-[#0A0F0D]/08 dark:border-white/08">
                <p className="text-xs text-[#0A0F0D]/40 dark:text-white/40 font-semibold uppercase tracking-wider">
                  Driver Details
                </p>

                {/* Plate number */}
                <div
                  className={`twende-auth-field ${focused === "plate" ? "twende-auth-field-focused" : ""}`}
                >
                  <CreditCard
                    size={17}
                    className={`twende-auth-icon ${focused === "plate" || formData.plate_number ? "twende-auth-icon-active" : ""}`}
                    strokeWidth={2.5}
                  />
                  <input
                    required={role === "driver"}
                    type="text"
                    placeholder="Plate number (e.g. KCB 123X)"
                    className="twende-auth-input uppercase"
                    value={formData.plate_number}
                    onFocus={() => setFocused("plate")}
                    onBlur={() => setFocused(null)}
                    onChange={(e) =>
                      setFormData({ ...formData, plate_number: e.target.value })
                    }
                  />
                </div>

                {/* Route select */}
                <div
                  className={`twende-auth-field ${focused === "route" ? "twende-auth-field-focused" : ""}`}
                >
                  <MapPin
                    size={17}
                    className={`twende-auth-icon ${focused === "route" || formData.route_id ? "twende-auth-icon-active" : ""}`}
                    strokeWidth={2.5}
                  />
                  <select
                    title="Select Route"
                    required={role === "driver"}
                    disabled={fetchingRoutes}
                    className="twende-auth-input appearance-none cursor-pointer"
                    value={formData.route_id}
                    onFocus={() => setFocused("route")}
                    onBlur={() => setFocused(null)}
                    onChange={(e) =>
                      setFormData({ ...formData, route_id: e.target.value })
                    }
                  >
                    <option value="">
                      {fetchingRoutes ? "Loading routes…" : "Select your route"}
                    </option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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
                  <span>Create Account</span>
                  <ArrowRight size={18} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#0A0F0D]/50 dark:text-white/50 font-medium">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-[#1D9E75] font-black hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
