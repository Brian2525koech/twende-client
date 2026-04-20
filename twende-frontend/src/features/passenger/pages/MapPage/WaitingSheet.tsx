// src/features/passenger/pages/MapPage/WaitingSheet.tsx
//
// Slide-up modal that lets a passenger:
//   1. Pick their boarding stop from the route's stop list
//   2. Optionally pick a destination stop
//   3. Confirm → POST /api/sim/passenger/waiting
//
// Also shows the "cancel waiting" button when the passenger is already waiting.

import React, { useState } from 'react';
import {
  X, MapPin, Navigation, ChevronRight,
  CheckCircle2, Loader2, ArrowRight,
} from 'lucide-react';
import type { Stop, WaitingInfo } from './types';

interface Props {
  stops:           Stop[];
  routeId:         string | undefined;
  userPosition:    [number, number] | null;
  waitingInfo:     WaitingInfo | null;
  onConfirm:       (stopId: number, destStopId: number | null) => Promise<void>;
  onCancel:        () => Promise<void>;
  onClose:         () => void;
}

const WaitingSheet: React.FC<Props> = ({
  stops,
  waitingInfo, onConfirm, onCancel, onClose,
}) => {
  const [step,        setStep]        = useState<'board' | 'dest' | 'confirm'>('board');
  const [boardStop,   setBoardStop]   = useState<Stop | null>(null);
  const [destStop,    setDestStop]    = useState<Stop | null>(null);
  const [loading,     setLoading]     = useState(false);

  const handleConfirm = async () => {
    if (!boardStop) return;
    setLoading(true);
    try {
      await onConfirm(boardStop.id, destStop?.id ?? null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try { await onCancel(); } finally { setLoading(false); }
  };

  // ── Already waiting ────────────────────────────────────────────────────────
  if (waitingInfo) {
    return (
      <div className="ws-backdrop" onClick={onClose}>
        <div className="ws-sheet" onClick={e => e.stopPropagation()}>
          <button 
            className="ws-close" 
            onClick={onClose}
            aria-label="Close"     // ← Fixed
          >
            <X size={16} />
          </button>

          <div className="ws-waiting-active">
            <div className="ws-waiting-pulse">
              <div className="ws-waiting-dot" />
            </div>
            <h3 className="ws-waiting-title">You're on the list!</h3>
            <p className="ws-waiting-sub">
              Waiting at <strong>{waitingInfo.stop_name}</strong>
              {waitingInfo.destination_name && (
                <> → <strong>{waitingInfo.destination_name}</strong></>
              )}
            </p>
            <p className="ws-waiting-hint">
              A matatu will stop for you when it passes your stop heading the right direction.
            </p>

            <div className="ws-waiting-timer">
              <span className="ws-timer-dot" />
              <span>Looking for a matatu nearby…</span>
            </div>

            <button
              className="ws-cancel-btn"
              onClick={handleCancel}
              disabled={loading}
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Cancelling…</>
                : 'Cancel waiting'
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: pick boarding stop ───────────────────────────────────────────────
  if (step === 'board') {
    return (
      <div className="ws-backdrop" onClick={onClose}>
        <div className="ws-sheet" onClick={e => e.stopPropagation()}>
          <button 
            className="ws-close" 
            onClick={onClose}
            aria-label="Close"     // ← Fixed
          >
            <X size={16} />
          </button>

          <div className="ws-header">
            <div className="ws-header-icon">
              <MapPin size={18} className="text-white" />
            </div>
            <div>
              <h3 className="ws-title">Where are you?</h3>
              <p className="ws-sub">Pick your boarding stop</p>
            </div>
          </div>

          <div className="ws-stop-list">
            {stops.map((stop, idx) => {
              const isFirst = idx === 0;
              const isLast  = idx === stops.length - 1;
              return (
                <button
                  key={stop.id}
                  className={`ws-stop-row ${boardStop?.id === stop.id ? 'ws-stop-selected' : ''}`}
                  onClick={() => setBoardStop(stop)}
                >
                  <div className="ws-stop-timeline">
                    <div className={`ws-tl-line ${isFirst ? 'invisible' : ''}`} />
                    <div className={`ws-tl-dot ${isFirst || isLast ? 'ws-tl-dot-terminus' : ''} ${boardStop?.id === stop.id ? 'ws-tl-dot-active' : ''}`} />
                    <div className={`ws-tl-line ${isLast ? 'invisible' : ''}`} />
                  </div>
                  <span className={`ws-stop-name ${isFirst || isLast ? 'ws-stop-terminus' : ''}`}>
                    {stop.name}
                  </span>
                  {boardStop?.id === stop.id && (
                    <CheckCircle2 size={16} className="ws-check" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            className="ws-next-btn"
            disabled={!boardStop}
            onClick={() => setStep('dest')}
          >
            Next: Pick destination <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── Step: pick destination (optional) ─────────────────────────────────────
  if (step === 'dest') {
    const availableDests = stops.filter(s => s.id !== boardStop?.id);
    return (
      <div className="ws-backdrop" onClick={onClose}>
        <div className="ws-sheet" onClick={e => e.stopPropagation()}>
          <button 
            className="ws-close" 
            onClick={onClose}
            aria-label="Close"     // ← Fixed
          >
            <X size={16} />
          </button>

          <div className="ws-header">
            <div className="ws-header-icon ws-header-icon-blue">
              <Navigation size={18} className="text-white" />
            </div>
            <div>
              <h3 className="ws-title">Where are you going?</h3>
              <p className="ws-sub">Optional — helps the driver plan ahead</p>
            </div>
          </div>

          <div className="ws-boarding-from">
            <MapPin size={11} className="ws-from-pin" />
            <span>From: <strong>{boardStop?.name}</strong></span>
          </div>

          <div className="ws-stop-list">
            <button
              className={`ws-stop-row ws-skip-row ${!destStop ? 'ws-stop-selected' : ''}`}
              onClick={() => setDestStop(null)}
            >
              <span className="ws-stop-name ws-skip-label">⚡ Skip — I'll decide later</span>
              {!destStop && <CheckCircle2 size={16} className="ws-check" />}
            </button>

            {availableDests.map((stop) => {
              const globalIdx = stops.findIndex(s => s.id === stop.id);
              const isFirst = globalIdx === 0;
              const isLast  = globalIdx === stops.length - 1;
              return (
                <button
                  key={stop.id}
                  className={`ws-stop-row ${destStop?.id === stop.id ? 'ws-stop-selected' : ''}`}
                  onClick={() => setDestStop(stop)}
                >
                  <div className="ws-stop-timeline">
                    <div className={`ws-tl-line ${isFirst ? 'invisible' : ''}`} />
                    <div className={`ws-tl-dot ${isFirst || isLast ? 'ws-tl-dot-terminus' : ''} ${destStop?.id === stop.id ? 'ws-tl-dot-active' : ''}`} />
                    <div className={`ws-tl-line ${isLast ? 'invisible' : ''}`} />
                  </div>
                  <span className={`ws-stop-name ${isFirst || isLast ? 'ws-stop-terminus' : ''}`}>
                    {stop.name}
                  </span>
                  {destStop?.id === stop.id && (
                    <CheckCircle2 size={16} className="ws-check" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="ws-btn-row">
            <button className="ws-back-btn" onClick={() => setStep('board')}>
              ← Back
            </button>
            <button
              className="ws-next-btn ws-next-confirm"
              onClick={() => setStep('confirm')}
            >
              Review <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: confirm ──────────────────────────────────────────────────────────
  return (
    <div className="ws-backdrop" onClick={onClose}>
      <div className="ws-sheet" onClick={e => e.stopPropagation()}>
        <button 
          className="ws-close" 
          onClick={onClose}
          aria-label="Close"       // ← Fixed
        >
          <X size={16} />
        </button>

        <div className="ws-header">
          <div className="ws-header-icon ws-header-icon-green">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <div>
            <h3 className="ws-title">Ready to flag a matatu?</h3>
            <p className="ws-sub">Your pin will appear on the driver's map</p>
          </div>
        </div>

        <div className="ws-confirm-card">
          <div className="ws-confirm-row">
            <div className="ws-confirm-dot ws-confirm-dot-board" />
            <div>
              <span className="ws-confirm-label">Boarding at</span>
              <span className="ws-confirm-val">{boardStop?.name}</span>
            </div>
          </div>
          <div className="ws-confirm-arrow">
            <ArrowRight size={14} className="text-[rgba(0,0,0,0.2)]" />
          </div>
          <div className="ws-confirm-row">
            <div className="ws-confirm-dot ws-confirm-dot-dest" />
            <div>
              <span className="ws-confirm-label">Heading to</span>
              <span className="ws-confirm-val">
                {destStop?.name ?? <span className="ws-confirm-unset">Not specified</span>}
              </span>
            </div>
          </div>
        </div>

        <p className="ws-confirm-hint">
          🔔 You'll get notified when a matatu picks you up and when you're about to arrive.
        </p>

        <div className="ws-btn-row">
          <button className="ws-back-btn" onClick={() => setStep('dest')}>
            ← Back
          </button>
          <button
            className="ws-confirm-btn"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Marking…</>
              : '📍 Mark me waiting'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaitingSheet;