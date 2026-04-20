// src/features/passenger/pages/MapPage/index.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  Circle,
} from "react-leaflet";
import { ChevronLeft, WifiOff, Loader2, Bus } from "lucide-react";
import toast from "react-hot-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useAuth } from "@/contexts/AuthContext";           // ← NEW IMPORT
import { useLiveTracking } from "../../hooks/useLiveTracking";
import type { Driver, WaitingInfo, WaitingStatus, OnboardTrip } from "./types";
import { toNum, hasPosition, driverKey } from "./types";
import {
  createBusIcon,
  createUserIcon,
  createWaitingPassengerIcon,
} from "./MapIcons";
import BusPopup from "./BusPopup";
import BottomSheet from "./BottomSheet";
import WaitingSheet from "./WaitingSheet";
import OnboardOverlay from "./OnboardOverlay";
import "./mappage.css";
import { authFetch } from "@/lib/authFetch";

// ── Auto-fit to route ─────────────────────────────────────────────────────────
const FitRoute: React.FC<{ path: [number, number][] }> = ({ path }) => {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (path.length > 1 && !fitted.current) {
      map.fitBounds(L.latLngBounds(path), { padding: [70, 70], maxZoom: 15 });
      fitted.current = true;
    }
  }, [path, map]);
  return null;
};

// ── Main ──────────────────────────────────────────────────────────────────────
const MapPage: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();

  // ── Auth from context (replaces getUserId + getAuthToken) ───────────────────
  const { user, token } = useAuth();
  //console.log(token);
  const userId = user?.id ?? null;

  const { drivers, routePath, stops, loading, socketConnected, socket } =
    useLiveTracking(routeId);

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null,
  );
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark"),
  );

  // ── Waiting / trip state ───────────────────────────────────────────────────
  const [showWaitingSheet, setShowWaitingSheet] = useState(false);
  const [waitingStatus, setWaitingStatus] = useState<WaitingStatus>("idle");
  const [waitingInfo, setWaitingInfo] = useState<WaitingInfo | null>(null);
  const [currentTrip, setCurrentTrip] = useState<OnboardTrip | null>(null);
  const [arrivingSoon, setArrivingSoon] = useState(false);
  const [arrivingDest, setArrivingDest] = useState<string | undefined>();

  const API = import.meta.env.VITE_API_URL;;

  // ── Dark mode observer ─────────────────────────────────────────────────────
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  // ── Geolocation ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ── Keep selected driver fresh ─────────────────────────────────────────────
  const selectedDriverKeyRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedDriver) {
      selectedDriverKeyRef.current = null;
      return;
    }
    selectedDriverKeyRef.current = driverKey(selectedDriver);
  }, [selectedDriver]);

  useEffect(() => {
    if (selectedDriverKeyRef.current === null) return;
    const fresh = (drivers as Driver[]).find(
      (d) => driverKey(d) === selectedDriverKeyRef.current,
    );
    if (fresh) {
      setSelectedDriver((prev) =>
        prev && driverKey(prev) === driverKey(fresh) ? fresh : prev,
      );
    }
  }, [drivers]);

  // ── Poll current trip status on mount ─────────────────────────────────────
  useEffect(() => {
    if (!userId || !token) return;

    const fetchStatus = async () => {
      try {
        const res = await authFetch(`${API}/sim/passenger/${userId}/trip`, {
          headers: { Authorization: `Bearer ${token}` },   // ← using token from context
        });
        const data = await res.json();

        if (data.status === "waiting" && data.waiting) {
          setWaitingStatus("waiting");
          setWaitingInfo({
            waiting_id: data.waiting.id,
            stop_id: data.waiting.stop_id ?? 0,
            stop_name: data.waiting.stop_name,
            stop_lat: parseFloat(data.waiting.stop_lat) || 0,
            stop_lng: parseFloat(data.waiting.stop_lng) || 0,
            destination_name: data.waiting.destination_name ?? null,
            expires_at: data.waiting.expires_at,
          });
        } else if (data.status === "onboard" && data.trip) {
          setWaitingStatus("onboard");
          setCurrentTrip(data.trip);
        } else {
          setWaitingStatus("idle");
        }
      } catch {
        /* ignore — will fall back to socket events */
      }
    };
    fetchStatus();
  }, [userId, token]);

  // ── Socket events for this passenger ──────────────────────────────────────
  useEffect(() => {
    if (!socket || !userId || !token) return;

    // Picked up — transition to onboard
    const onBoarded = (data: any) => {
      setWaitingStatus("onboard");
      setWaitingInfo(null);
      if (data.trip_id) {
        // Re-fetch full trip details
        authFetch(`${API}/sim/passenger/${userId}/trip`, {
          headers: { Authorization: `Bearer ${token}` },   // ← using token from context
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.trip) setCurrentTrip(d.trip);
          })
          .catch(() => {});
      }
      toast.success(
        `🚌 You've been picked up! Heading to ${data.destination ?? "your destination"}`,
        { duration: 5000 },
      );
    };

    // Alighting soon warning
    const onAlightingSoon = (data: any) => {
      setWaitingStatus("arriving");
      setArrivingSoon(true);
      setArrivingDest(data.destination);
      toast(`📍 Approaching ${data.destination} — prepare to alight`, {
        duration: 6000,
        icon: "🔔",
      });
    };

    // Alighted — trip complete
    const onAlighting = (data: any) => {
      setWaitingStatus("idle");
      setCurrentTrip(null);
      setArrivingSoon(false);
      setArrivingDest(undefined);
      toast.success(
        `✅ Arrived at ${data.destination}! ${data.fare ? `Fare: KSh ${data.fare}` : ""}`,
        { duration: 6000 },
      );
    };

    // Payment confirmed
    const onPaymentConfirmed = (data: any) => {
      setCurrentTrip((prev) =>
        prev ? { ...prev, payment_status: "paid" } : prev,
      );
      toast.success(`✅ Cash payment of KSh ${data.fare} confirmed!`, {
        duration: 4000,
      });
    };

    socket.on(`passenger:${userId}:boarded`, onBoarded);
    socket.on(`passenger:${userId}:alighting_soon`, onAlightingSoon);
    socket.on(`passenger:${userId}:alighting`, onAlighting);
    socket.on(`passenger:${userId}:payment_confirmed`, onPaymentConfirmed);

    return () => {
      socket.off(`passenger:${userId}:boarded`, onBoarded);
      socket.off(`passenger:${userId}:alighting_soon`, onAlightingSoon);
      socket.off(`passenger:${userId}:alighting`, onAlighting);
      socket.off(`passenger:${userId}:payment_confirmed`, onPaymentConfirmed);
    };
  }, [socket, userId, token]);

  // ── Notify toast when a matatu stops ──────────────────────────────────────
  const prevWaiting = useRef<string>("");
  useEffect(() => {
    if (!notifyEnabled) return;
    const key = (drivers as Driver[])
      .filter((d) => d.is_waiting && hasPosition(d))
      .map((d) => d.plate_number)
      .join(",");
    if (key && key !== prevWaiting.current) {
      const d = (drivers as Driver[]).find((d) => d.is_waiting);
      if (d)
        toast.success(`${d.plate_number} has stopped — board now!`, {
          duration: 5000,
        });
    }
    prevWaiting.current = key;
  }, [drivers, notifyEnabled]);

  // ── Mark waiting ───────────────────────────────────────────────────────────
  const handleMarkWaiting = useCallback(
    async (stopId: number, destStopId: number | null) => {
      if (!userId || !routeId || !token) {
        toast.error("Please log in to flag a matatu");
        return;
      }
      try {
        const res = await authFetch(`${API}/sim/passenger/waiting`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,          // ← using token from context
          },
          body: JSON.stringify({
            route_id: parseInt(routeId, 10),
            stop_id: stopId,
            destination_stop_id: destStopId,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.message ?? "Could not mark you as waiting");
          return;
        }

        setWaitingInfo({
          waiting_id: data.waiting_id,
          stop_id: stopId,
          stop_name: data.stop_name,
          stop_lat: data.stop_lat,
          stop_lng: data.stop_lng,
          destination_name: data.destination_name ?? null,
          expires_at: data.expires_at,
        });
        setWaitingStatus("waiting");
        setShowWaitingSheet(false);

        toast.success(`📍 You're marked waiting at ${data.stop_name}!`, {
          duration: 4000,
        });
      } catch {
        toast.error("Network error — please try again");
      }
    },
    [userId, routeId, token],
  );

  // ── Cancel waiting ─────────────────────────────────────────────────────────
  const handleCancelWaiting = useCallback(async () => {
    if (!userId || !token) return;
    try {
      await authFetch(`${API}/sim/passenger/waiting`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },   // ← using token from context
      });
      setWaitingStatus("idle");
      setWaitingInfo(null);
      setShowWaitingSheet(false);
      toast("🔕 Waiting cancelled", { duration: 2000 });
    } catch {
      toast.error("Could not cancel — please try again");
    }
  }, [userId, token]);

  const handleToggleNotify = useCallback(() => {
    setNotifyEnabled((n) => {
      const next = !n;
      toast(
        next
          ? "🔔 You'll be notified when a matatu stops"
          : "🔕 Notifications off",
        { duration: 2000 },
      );
      return next;
    });
  }, []);

  const visibleDrivers = (drivers as Driver[]).filter(hasPosition);
  const center: [number, number] =
    userPosition ?? (routePath.length > 0 ? routePath[0] : [-1.286, 36.817]);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const attribution = isDark
    ? '&copy; <a href="https://carto.com">CARTO</a>'
    : '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>';

  const isOnboard = waitingStatus === "onboard" || waitingStatus === "arriving";

  return (
    <div className="mp-root">
      {/* ── TOP BAR ── */}
      <div className="mp-topbar-wrapper">
        <div className="mp-topbar-fade" />
        <div className="mp-topbar">
          <button
            onClick={() => navigate(-1)}
            className="mp-icon-btn"
            aria-label="Back"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>

          <div className="mp-route-pill">
            <span className="mp-route-label">Live Tracker</span>
            <span className="mp-route-name">Route {routeId}</span>
          </div>

          <div
            className={`mp-status-chip ${socketConnected ? "mp-status-live" : "mp-status-offline"}`}
          >
            {socketConnected ? (
              <>
                <span className="mp-live-dot" />
                Live
              </>
            ) : (
              <>
                <WifiOff size={11} strokeWidth={2.5} />
                Offline
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── LOADING OVERLAY ── */}
      {loading && (
        <div className="mp-loading-overlay">
          <div className="mp-loading-card">
            <div className="mp-loading-icon">
              <Bus size={30} className="text-[#1D9E75]" strokeWidth={2} />
              <Loader2
                size={14}
                className="mp-loading-spinner text-white animate-spin"
              />
            </div>
            <p className="mp-loading-title">Finding matatus…</p>
            <p className="mp-loading-sub">Connecting to route {routeId}</p>
          </div>
        </div>
      )}

      {/* ── MAP ── */}
      <MapContainer
        center={center}
        zoom={14}
        zoomControl={false}
        className="mp-map"
        maxZoom={19}
      >
        <TileLayer
          key={tileUrl}
          url={tileUrl}
          attribution={attribution}
          maxZoom={19}
        />

        <FitRoute path={routePath} />

        {/* Route polyline glow */}
        {routePath.length > 0 && (
          <>
            <Polyline
              positions={routePath}
              pathOptions={{
                color: "#1D9E75",
                weight: 22,
                opacity: 0.06,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={routePath}
              pathOptions={{
                color: "#1D9E75",
                weight: 5,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={routePath}
              pathOptions={{
                color: "#7EEDC8",
                weight: 2,
                opacity: 0.7,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}

        {/* User position */}
        {userPosition && (
          <>
            <Marker position={userPosition} icon={createUserIcon()} />
            <Circle
              center={userPosition}
              radius={60}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.08,
                weight: 1,
                dashArray: "4 3",
              }}
            />
          </>
        )}

        {/* ── Waiting passenger marker (self) ── */}
        {waitingStatus === "waiting" &&
          waitingInfo &&
          waitingInfo.stop_lat &&
          waitingInfo.stop_lng && (
            <>
              <Marker
                position={[waitingInfo.stop_lat, waitingInfo.stop_lng]}
                icon={createWaitingPassengerIcon("You")}
              />
              <Circle
                center={[waitingInfo.stop_lat, waitingInfo.stop_lng]}
                radius={80}
                pathOptions={{
                  color: "#f59e0b",
                  fillColor: "#f59e0b",
                  fillOpacity: 0.08,
                  weight: 1.5,
                  dashArray: "5 4",
                }}
              />
            </>
          )}

        {/* Bus markers */}
        {visibleDrivers.map((d) => {
          const isSelected = selectedDriver
            ? driverKey(selectedDriver) === driverKey(d)
            : false;
          return (
            <Marker
              key={driverKey(d)}
              position={[toNum(d.latitude), toNum(d.longitude)]}
              icon={createBusIcon(
                d.plate_number,
                isSelected,
                d.is_waiting ?? false,
              )}
              eventHandlers={{
                click: () => setSelectedDriver(isSelected ? null : d),
              }}
            >
              <Popup
                className="mp-popup"
                closeButton={false}
                maxWidth={300}
                minWidth={260}
              >
                <BusPopup
                  driver={d}
                  isDark={isDark}
                  userLat={userPosition?.[0] ?? null}
                  userLng={userPosition?.[1] ?? null}
                />
              </Popup>
            </Marker>
          );
        })}

        {/* Accuracy ring on selected bus */}
        {selectedDriver && hasPosition(selectedDriver) && (
          <Circle
            center={[
              toNum(selectedDriver.latitude),
              toNum(selectedDriver.longitude),
            ]}
            radius={90}
            pathOptions={{
              color: "#1D9E75",
              fillColor: "#1D9E75",
              fillOpacity: 0.05,
              weight: 1.5,
              dashArray: "6 4",
            }}
          />
        )}
      </MapContainer>

      {/* ── ONBOARD OVERLAY ── */}
      {isOnboard && currentTrip && (
        <OnboardOverlay
          trip={currentTrip}
          arrivingSoon={arrivingSoon}
          destinationName={arrivingDest}
        />
      )}

      {/* ── BOTTOM SHEET ── */}
      <BottomSheet
        drivers={drivers as Driver[]}
        stops={stops}
        selectedDriver={selectedDriver}
        onSelectDriver={setSelectedDriver}
        socketConnected={socketConnected}
        loading={loading}
        onViewMatatu={(plate) => navigate(`/matatu/${plate}`)}
        onToggleNotify={handleToggleNotify}
        notifyEnabled={notifyEnabled}
        waitingStatus={waitingStatus}
        waitingInfo={waitingInfo}
        onOpenWaiting={() => setShowWaitingSheet(true)}
      />

      {/* ── WAITING SHEET MODAL ── */}
      {showWaitingSheet && (
        <WaitingSheet
          stops={stops}
          routeId={routeId}
          userPosition={userPosition}
          waitingInfo={waitingInfo}
          onConfirm={handleMarkWaiting}
          onCancel={handleCancelWaiting}
          onClose={() => setShowWaitingSheet(false)}
        />
      )}
    </div>
  );
};

export default MapPage;