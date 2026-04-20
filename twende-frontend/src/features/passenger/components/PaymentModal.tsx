// src/features/passenger/components/PaymentModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Phone, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  trip: {
    id: string;
    fare: number;
    routeName?: string;
    from: string;
    to: string;
    matatuNumber?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentStep = 'enter_phone' | 'processing' | 'confirm_pin' | 'success';

const PaymentModal: React.FC<PaymentModalProps> = ({ trip, onClose, onSuccess }) => {
  const [step, setStep] = useState<PaymentStep>('enter_phone');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(20);

  // Countdown timer during STK push simulation
  useEffect(() => {
    if (step !== 'confirm_pin') return;
    if (countdown <= 0) {
      setStep('enter_phone');
      toast.error('M-Pesa request timed out. Please try again.');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  const formatPhone = (val: string) => {
    // Strip non-digits, enforce Kenya format
    const digits = val.replace(/\D/g, '');
    if (digits.startsWith('0')) return '254' + digits.slice(1);
    if (digits.startsWith('7') || digits.startsWith('1')) return '254' + digits;
    return digits;
  };

  const handleSendSTK = async () => {
    const formatted = formatPhone(phone);
    if (formatted.length < 12) {
      toast.error('Enter a valid Safaricom number');
      return;
    }

    setLoading(true);
    // Simulate network delay for STK push
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false);
    setCountdown(20);
    setStep('confirm_pin');
  };

  const handleConfirmPayment = async () => {
    setLoading(true);
    setStep('processing');

    // Simulate M-Pesa processing delay
    await new Promise(r => setTimeout(r, 2500));

    setStep('success');
    setLoading(false);

    // Give user time to see success state before closing
    await new Promise(r => setTimeout(r, 1500));
    onSuccess();
  };

  return (
    <div className="twende-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="twende-modal-sheet">

        {/* Close button */}
        {step !== 'processing' && step !== 'success' && (
          <button type="button" aria-label="Close modal" onClick={onClose} className="twende-modal-close">
            <X size={18} strokeWidth={2.5} />
          </button>
        )}

        {/* ── STEP 1: Enter Phone ── */}
        {step === 'enter_phone' && (
          <>
            <div className="twende-modal-icon-wrap twende-modal-icon-green">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/200px-M-PESA_LOGO-01.svg.png"
                alt="M-Pesa"
                className="twende-mpesa-logo"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="twende-mpesa-fallback">M-PESA</span>
            </div>

            <h2 className="twende-modal-title">Pay with M-Pesa</h2>
            <p className="twende-modal-subtitle">
              You'll receive an STK push to confirm payment
            </p>

            {/* Fare summary */}
            <div className="twende-payment-summary">
              <div className="twende-payment-row">
                <span className="twende-payment-label">Route</span>
                <span className="twende-payment-value">{trip.routeName || `${trip.from} → ${trip.to}`}</span>
              </div>
              {trip.matatuNumber && (
                <div className="twende-payment-row">
                  <span className="twende-payment-label">Matatu</span>
                  <span className="twende-payment-value">{trip.matatuNumber}</span>
                </div>
              )}
              <div className="twende-payment-row twende-payment-total">
                <span className="twende-payment-label">Amount</span>
                <span className="twende-payment-amount">KSh {trip.fare.toLocaleString()}</span>
              </div>
            </div>

            {/* Phone input */}
            <div className="twende-phone-field">
              <div className="twende-phone-prefix">
                <span>🇰🇪</span>
                <span>+254</span>
              </div>
              <input
                type="tel"
                placeholder="7XX XXX XXX"
                maxLength={10}
                className="twende-phone-input"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button
              onClick={handleSendSTK}
              disabled={loading || phone.length < 9}
              className="twende-modal-btn-primary"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Sending request…</>
              ) : (
                <><Phone size={18} /> Send STK Push</>
              )}
            </button>

            <div className="twende-secure-note">
              <ShieldCheck size={13} />
              <span>Secured by Safaricom M-Pesa</span>
            </div>
          </>
        )}

        {/* ── STEP 2: Awaiting PIN ── */}
        {step === 'confirm_pin' && (
          <>
            <div className="twende-modal-icon-wrap twende-modal-icon-amber">
              <Phone size={28} className="twende-modal-icon-inner" strokeWidth={2} />
            </div>

            <h2 className="twende-modal-title">Check your phone</h2>
            <p className="twende-modal-subtitle">
              Enter your M-Pesa PIN on your phone to complete the payment of{' '}
              <strong>KSh {trip.fare.toLocaleString()}</strong>
            </p>

            {/* Countdown ring */}
            <div className="twende-countdown-wrap">
              <svg className="twende-countdown-svg" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" className="twende-countdown-track" />
                <circle
                  cx="32" cy="32" r="28"
                  className="twende-countdown-fill"
                  strokeDasharray={`${(countdown / 20) * 176} 176`}
                />
              </svg>
              <span className="twende-countdown-num">{countdown}</span>
            </div>

            <p className="twende-modal-subtitle" style={{ marginTop: 0 }}>seconds remaining</p>

            <button onClick={handleConfirmPayment} className="twende-modal-btn-primary">
              I've entered my PIN ✓
            </button>

            <button
              onClick={() => { setStep('enter_phone'); setCountdown(20); }}
              className="twende-modal-btn-ghost"
            >
              Resend request
            </button>
          </>
        )}

        {/* ── STEP 3: Processing ── */}
        {step === 'processing' && (
          <>
            <div className="twende-modal-icon-wrap twende-modal-icon-green twende-modal-icon-pulse">
              <Loader2 size={32} className="animate-spin twende-modal-icon-inner" strokeWidth={2} />
            </div>
            <h2 className="twende-modal-title">Processing payment…</h2>
            <p className="twende-modal-subtitle">Please wait while we confirm with M-Pesa</p>
          </>
        )}

        {/* ── STEP 4: Success ── */}
        {step === 'success' && (
          <>
            <div className="twende-modal-icon-wrap twende-modal-icon-green">
              <CheckCircle2 size={36} className="twende-modal-icon-inner" strokeWidth={2} />
            </div>
            <h2 className="twende-modal-title">Payment Successful!</h2>
            <p className="twende-modal-subtitle">
              KSh {trip.fare.toLocaleString()} paid successfully via M-Pesa
            </p>
            <div className="twende-success-confetti">🎉</div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;