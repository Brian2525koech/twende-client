// src/features/driver/pages/DashboardPage/WaitingCard.tsx
import React from 'react';
import { MapPin, ArrowRight, UserCheck, CheckCircle2, XCircle } from 'lucide-react';
import type { WaitingPassenger } from './types';
import { waitingDuration } from './types';

interface Props {
  waiting:       WaitingPassenger;
  myDriverId:    number;
  onAccept:      () => void;
  onBoard:       () => void;
  isAccepting:   boolean;
  isBoarding:    boolean;
}

const WaitingCard: React.FC<Props> = ({
  waiting, myDriverId, onAccept, onBoard, isAccepting, isBoarding,
}) => {
  const isMyPassenger   = waiting.accepted_by_driver_id === myDriverId;
  const isTakenByOther  = waiting.status === 'accepted' && !isMyPassenger;
  const isWaiting       = waiting.status === 'waiting';

  return (
    <div className={`wcard-root ${isMyPassenger ? 'wcard-mine' : isTakenByOther ? 'wcard-taken' : ''}`}>
      {/* Coloured top strip */}
      <div className={`wcard-strip ${
        isMyPassenger  ? 'wcard-strip-mine' :
        isTakenByOther ? 'wcard-strip-taken' : 'wcard-strip-waiting'
      }`} />

      <div className="wcard-body">
        {/* Top row: avatar + info + status */}
        <div className="wcard-top">
          <div className="wcard-avatar">
            {(waiting.passenger_name || 'P')[0].toUpperCase()}
          </div>
          <div className="wcard-info">
            <p className="wcard-name">{waiting.passenger_name}</p>
            <div className="wcard-location">
              <MapPin size={11} strokeWidth={2.5} className="wcard-pin-icon" />
              <span className="truncate">{waiting.stop_name}</span>
              {waiting.destination_name && (
                <>
                  <ArrowRight size={10} className="wcard-arrow" />
                  <span className="truncate">{waiting.destination_name}</span>
                </>
              )}
            </div>
          </div>
          <div className="wcard-meta">
            <span className={`wcard-status-pill ${
              isMyPassenger  ? 'wpill-mine' :
              isTakenByOther ? 'wpill-taken' : 'wpill-waiting'
            }`}>
              {isMyPassenger ? '✓ Accepted' : isTakenByOther ? 'Taken' : 'Waiting'}
            </span>
            <span className="wcard-time">{waitingDuration(waiting.created_at)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="wcard-actions">
          {isWaiting && (
            <button
              onClick={onAccept}
              disabled={isAccepting}
              className="wcard-btn wcard-btn-accept"
            >
              {isAccepting
                ? <div className="wcard-spinner" />
                : <UserCheck size={14} strokeWidth={2.5} />
              }
              Accept
            </button>
          )}
          {isMyPassenger && (
            <button
              onClick={onBoard}
              disabled={isBoarding}
              className="wcard-btn wcard-btn-board"
            >
              {isBoarding
                ? <div className="wcard-spinner" />
                : <CheckCircle2 size={14} strokeWidth={2.5} />
              }
              Mark Boarded
            </button>
          )}
          {isTakenByOther && (
            <div className="wcard-taken-label">
              <XCircle size={13} strokeWidth={2} />
              Another driver accepted
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitingCard;