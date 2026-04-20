// src/features/driver/pages/DashboardPage/useDriverDashboard.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import api from "@/lib/api/axios";
import type {
  DriverProfile,
  DashboardStats,
  WaitingPassenger,
  RecentTrip,
  RecentRating,
} from "./types";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

interface UseDriverDashboardReturn {
  profile: DriverProfile | null;
  stats: DashboardStats | null;
  waitingPassengers: WaitingPassenger[];
  recentTrips: RecentTrip[];
  recentRatings: RecentRating[];
  loading: boolean;
  error: string | null;
  togglingStatus: boolean;
  acceptingId: number | null;
  socketConnected: boolean;
  refresh: () => Promise<void>;
  toggleStatus: (isActive: boolean) => Promise<void>;
  acceptPassenger: (waitId: number) => Promise<void>;
  markBoarded: (waitId: number) => Promise<void>;
}

export const useDriverDashboard = (): UseDriverDashboardReturn => {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [waitingPassengers, setWaitingPassengers] = useState<
    WaitingPassenger[]
  >([]);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [recentRatings, setRecentRatings] = useState<RecentRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // ── 1. Fetch dashboard data ───────────────────────────────────────────────
  const fetchDashboard = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/driver/dashboard", {
        signal: signal instanceof AbortSignal ? signal : undefined,
      });

      if (!res.data || !res.data.profile) {
        throw new Error("Invalid response from server — profile missing");
      }

      const d = res.data;
      setProfile(d.profile);
      setStats(d.stats ?? null);
      setWaitingPassengers(d.waiting_passengers ?? []);
      setRecentTrips(d.recent_trips ?? []);
      setRecentRatings(d.recent_ratings ?? []);
    } catch (err: any) {
      // Ignore aborts — these are intentional cleanup cancellations
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load dashboard. Check your connection.";
      console.error("[useDriverDashboard] fetchDashboard failed:", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboard(controller.signal);
    return () => controller.abort();
  }, [fetchDashboard]);

  // ── 2. Socket — register AFTER profile is known (routeId is available) ────
  useEffect(() => {
    if (!profile?.route_id || !profile?.profile_id) return;

    const routeId = profile.route_id;
    const profileId = profile.profile_id;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("join:driver", profileId); // ← join personal room
      socket.emit("join:route", routeId); // ← join route room
      console.log("[useDriverDashboard] Socket connected, route:", routeId);
    });

    socket.on("disconnect", (reason) => {
      setSocketConnected(false);
      console.log("[useDriverDashboard] Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("[useDriverDashboard] Socket connect error:", err.message);
    });

    socket.on(
      `route:${routeId}:passenger_waiting`,
      (payload: WaitingPassenger) => {
        setWaitingPassengers((prev) => {
          if (prev.find((w) => w.id === payload.id)) return prev;
          return [payload, ...prev];
        });
      },
    );

    socket.on(
      `route:${routeId}:passenger_cancelled`,
      ({ waiting_id }: { waiting_id: number }) => {
        setWaitingPassengers((prev) => prev.filter((w) => w.id !== waiting_id));
      },
    );

    socket.on(
      `route:${routeId}:passenger_accepted`,
      ({
        waiting_id,
        driver_id,
      }: {
        waiting_id: number;
        driver_id: number;
      }) => {
        setWaitingPassengers((prev) =>
          prev.map((w) =>
            w.id === waiting_id
              ? {
                  ...w,
                  status: "accepted" as const,
                  accepted_by_driver_id: driver_id,
                }
              : w,
          ),
        );
      },
    );

    socket.on(
      `route:${routeId}:passenger_boarded`,
      ({ waiting_id }: { waiting_id: number }) => {
        setWaitingPassengers((prev) => prev.filter((w) => w.id !== waiting_id));
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [profile?.route_id, profile?.profile_id]);

  // ── 3. Toggle online/offline ─────────────────────────────────────────────
  const toggleStatus = useCallback(async (isActive: boolean) => {
    setTogglingStatus(true);
    try {
      await api.patch("/driver/status", { is_active: isActive });
      setProfile((prev) => (prev ? { ...prev, is_active: isActive } : prev));
    } catch (err: any) {
      console.error(
        "[useDriverDashboard] toggleStatus failed:",
        err?.response?.data ?? err,
      );
      throw err;
    } finally {
      setTogglingStatus(false);
    }
  }, []);

  // ── 4. Accept a waiting passenger ────────────────────────────────────────
  const acceptPassenger = useCallback(async (waitId: number) => {
    setAcceptingId(waitId);
    try {
      await api.patch(`/driver/waiting/${waitId}/accept`);
      setWaitingPassengers((prev) =>
        prev.map((w) =>
          w.id === waitId ? { ...w, status: "accepted" as const } : w,
        ),
      );
    } catch (err: any) {
      console.error(
        "[useDriverDashboard] acceptPassenger failed:",
        err?.response?.data ?? err,
      );
      throw err;
    } finally {
      setAcceptingId(null);
    }
  }, []);

  // ── 5. Mark as boarded ───────────────────────────────────────────────────
  const markBoarded = useCallback(async (waitId: number) => {
    try {
      await api.patch(`/driver/waiting/${waitId}/board`);
      setWaitingPassengers((prev) => prev.filter((w) => w.id !== waitId));
    } catch (err: any) {
      console.error(
        "[useDriverDashboard] markBoarded failed:",
        err?.response?.data ?? err,
      );
      throw err;
    }
  }, []);

  return {
    profile,
    stats,
    waitingPassengers,
    recentTrips,
    recentRatings,
    loading,
    error,
    togglingStatus,
    acceptingId,
    socketConnected,
    refresh: fetchDashboard,
    toggleStatus,
    acceptPassenger,
    markBoarded,
  };
};
