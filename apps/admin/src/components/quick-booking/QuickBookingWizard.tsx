/* eslint-disable @typescript-eslint/no-magic-numbers */
/**
 * QuickBookingWizard — 4-step phone-call intake flow.
 *
 *   Step 1  Location           — Mapbox autocomplete + safety + route intelligence
 *   Step 2  Job                — job type / problem / tyre size + locking nut
 *   Step 3  Price              — auto-quote + breakdown + payment recommendation
 *   Step 4  Customer & Payment — phone-first lookup + payment mode + create
 *
 * Designed for an admin who is on a phone call with a customer in 30–60 sec.
 * Reuses the existing POST /api/admin/quick-booking endpoint untouched —
 * wizard-specific context (safety, confidence, payment mode, price snapshot,
 * tyre size) is encoded into the pinned internal note.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, Text, Pressable, Linking, ActivityIndicator, Share, Alert } from 'react-native';
import { copyToClipboard } from '@/lib/clipboard';
import { router } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { AdminButton } from '@/components/ui/AdminButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import { useToast } from '@/components/ui/Toast';
import { playSound } from '@/lib/sound/play-sound';
import { createQuickBooking, sendLocationRequest } from '@/lib/api/admin-efficiency';
import { ApiError } from '@/lib/api/client';
import {
  fetchRouteIntelligence,
  fetchQuickPriceQuote,
  lookupCustomerByPhone,
  type RouteIntelligenceResponse,
  type QuickPriceQuoteResponse,
  type CustomerLookupResponse,
  type LocationConfidence,
  type TrafficLevel,
} from '@/lib/api/quick-booking-helpers';
import { apiPost } from '@/lib/api/client';
import {
  saveQuickBookingDraft,
  loadQuickBookingDraft,
  clearQuickBookingDraft,
  type QuickBookingDraft,
} from '@/lib/quick-booking-draft';
import { MapboxAddressAutocomplete } from './MapboxAddressAutocomplete';
import { TyreSizeAutocomplete } from './TyreSizeAutocomplete';
import { LocationRequestPanel } from './LocationRequestPanel';
import { LiveRouteLine } from './LiveRouteLine';
import { PricingSafetySignal } from '@/components/pricing/PricingSafetySignal';
import type { StockItem } from '@/types/stock';
import type { QuickBookingInput } from '@/types/admin-efficiency';

/* ---------------- Constants ---------------- */

type StepId = 1 | 2 | 3 | 4;
type JobType = 'ASSESSMENT' | 'REPLACEMENT';
type ProblemType =
  | 'PUNCTURE_OR_FLAT'
  | 'DAMAGED_OR_BLOWN_OUT'
  | 'SLOW_PRESSURE_LOSS'
  | 'NEEDS_REPLACEMENT'
  | 'NOT_SURE';
type LockingNut = 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY' | 'UNSURE';
type SafetyStatus = 'SAFE' | 'ROADSIDE' | 'HIGH_RISK' | 'UNKNOWN';
type PaymentMode = 'CASH' | 'DEPOSIT' | 'FULL';
type BalanceMethod = 'PAYMENT_LINK_LATER' | 'CASH_ON_SITE' | 'CARD_ON_SITE';

const STEP_TITLES: Record<StepId, string> = {
  1: 'Location & safety',
  2: 'Job & tyre',
  3: 'Price & payment plan',
  4: 'Customer & confirmation',
};

interface QuickProps {
  prefill?: {
    source?: string;
    callClickEventId?: string;
    emergencyAssistEventId?: string;
    phone?: string;
    customerName?: string;
    tyreProblemType?: string;
    jobType?: string;
    locationLabel?: string;
    latitude?: number;
    longitude?: number;
    vehicleRegistration?: string;
  };
}

/* ---------------- Top-level wizard ---------------- */

export function QuickBookingWizard(props: QuickProps): React.JSX.Element {
  const toast = useToast();

  // -------- State --------
  const [step, setStep] = useState<StepId>(1);

  // Location
  const [locationLabel, setLocationLabel] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [postcode, setPostcode] = useState<string | null>(null);
  const [locationConfidence, setLocationConfidence] =
    useState<LocationConfidence>('MISSING_LOCATION');
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus>('UNKNOWN');
  const [routeIntel, setRouteIntel] = useState<RouteIntelligenceResponse | null>(null);
  const [routeIntelLoading, setRouteIntelLoading] = useState(false);

  // Job
  const [jobType, setJobType] = useState<JobType>('ASSESSMENT');
  const [problemType, setProblemType] = useState<ProblemType>('NOT_SURE');
  const [tyreSize, setTyreSize] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [lockingNut, setLockingNut] = useState<LockingNut>('STANDARD_ONLY');

  // Price
  const [priceQuote, setPriceQuote] = useState<QuickPriceQuoteResponse | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  // Admin manual price edit. When set, this overrides the engine/learned
  // suggested total. Cleared whenever the live quote is refreshed.
  const [priceOverrideGbp, setPriceOverrideGbp] = useState<string | null>(null);

  // Customer & payment
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [balanceMethod, setBalanceMethod] = useState<BalanceMethod>('PAYMENT_LINK_LATER');
  const [cashTermsConfirmed, setCashTermsConfirmed] = useState(false);

  const [customerLookup, setCustomerLookup] = useState<CustomerLookupResponse | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    bookingId: string;
    trackingId: string;
    paymentMode?: 'CASH' | 'DEPOSIT' | 'FULL';
    paymentUrl?: string;
    depositAmountGbp?: string;
    balanceDueGbp?: string;
  } | null>(null);

  // Aux
  const [showCallScript, setShowCallScript] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const lastSavedDraftRef = useRef(0);

  // -------- Prefill from popups (call-click / emergency assist) --------
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    const p = props.prefill;
    if (!p) {
      prefilledRef.current = true;
      return;
    }
    if (p.phone) setCustomerPhone(p.phone);
    if (p.customerName) setCustomerName(p.customerName);
    if (p.tyreProblemType && isProblemType(p.tyreProblemType)) setProblemType(p.tyreProblemType);
    if (p.jobType === 'REPLACEMENT' || p.jobType === 'ASSESSMENT') setJobType(p.jobType);
    if (p.locationLabel) setLocationLabel(p.locationLabel);
    if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
      setLatitude(p.latitude);
      setLongitude(p.longitude);
      setLocationConfidence('GPS_ONLY');
    }
    const noteParts: string[] = [];
    if (p.source) noteParts.push(`Source: ${p.source}`);
    if (p.vehicleRegistration) {
      noteParts.push(`Vehicle: ${p.vehicleRegistration.toUpperCase()}`);
    }
    if (p.callClickEventId) noteParts.push(`Call-click: ${p.callClickEventId}`);
    if (p.emergencyAssistEventId) noteParts.push(`Emergency assist: ${p.emergencyAssistEventId}`);
    if (noteParts.length > 0) setInternalNote(noteParts.join(' · '));
    prefilledRef.current = true;
  }, [props.prefill]);

  // -------- Load draft once on mount --------
  useEffect(() => {
    if (draftLoaded) return;
    void (async (): Promise<void> => {
      const draft = await loadQuickBookingDraft();
      if (draft && !props.prefill?.phone) {
        if (draft.customerPhone) setCustomerPhone(draft.customerPhone);
        if (draft.customerName) setCustomerName(draft.customerName);
        if (draft.customerEmail) setCustomerEmail(draft.customerEmail);
        if (draft.locationLabel) setLocationLabel(draft.locationLabel);
        if (typeof draft.latitude === 'number') setLatitude(draft.latitude);
        if (typeof draft.longitude === 'number') setLongitude(draft.longitude);
        if (draft.jobType) setJobType(draft.jobType);
        if (draft.tyreProblemType && isProblemType(draft.tyreProblemType)) {
          setProblemType(draft.tyreProblemType);
        }
        if (draft.tyreSize) setTyreSize(draft.tyreSize);
        if (draft.lockingWheelNutStatus && isLockingNut(draft.lockingWheelNutStatus)) {
          setLockingNut(draft.lockingWheelNutStatus);
        }
        if (draft.paymentMode) setPaymentMode(draft.paymentMode);
        if (draft.internalNote) setInternalNote(draft.internalNote);
        if (draft.step && draft.step >= 1 && draft.step <= 4) {
          setStep(draft.step as StepId);
        }
        toast.show('Draft restored', 'info');
      }
      setDraftLoaded(true);
    })();
  }, [draftLoaded, props.prefill?.phone, toast]);

  // -------- Auto-save draft (throttled) --------
  useEffect(() => {
    if (!draftLoaded || success) return;
    const now = Date.now();
    if (now - lastSavedDraftRef.current < 1500) return;
    lastSavedDraftRef.current = now;
    const snapshot: Omit<QuickBookingDraft, 'savedAt'> = {
      customerPhone,
      customerName,
      customerEmail,
      locationLabel,
      jobType,
      tyreProblemType: problemType,
      tyreSize,
      lockingWheelNutStatus: lockingNut,
      paymentMode,
      internalNote,
      step,
    };
    if (latitude != null) snapshot.latitude = latitude;
    if (longitude != null) snapshot.longitude = longitude;
    if (selectedStock?.stockId) snapshot.selectedStockId = selectedStock.stockId;
    void saveQuickBookingDraft(snapshot);
  }, [
    draftLoaded,
    success,
    customerPhone,
    customerName,
    customerEmail,
    locationLabel,
    latitude,
    longitude,
    jobType,
    problemType,
    tyreSize,
    selectedStock?.stockId,
    lockingNut,
    paymentMode,
    internalNote,
    step,
  ]);

  // -------- Auto fetch customer lookup when phone changes --------
  useEffect(() => {
    const phone = customerPhone.trim();
    if (phone.length < 7) {
      setCustomerLookup(null);
      return;
    }
    setLookupLoading(true);
    const handle = setTimeout(() => {
      void lookupCustomerByPhone(phone)
        .then((res) => {
          setCustomerLookup(res);
          if (res.found && res.customer?.fullName && !customerName.trim()) {
            setCustomerName(res.customer.fullName);
          }
          if (res.found && res.customer?.email && !customerEmail.trim()) {
            setCustomerEmail(res.customer.email);
          }
        })
        .catch(() => setCustomerLookup(null))
        .finally(() => setLookupLoading(false));
    }, 500);
    return (): void => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPhone]);

  // -------- Route intelligence: refresh when location changes --------
  const refreshRouteIntel = useCallback(async (): Promise<void> => {
    const hasCoords = latitude != null && longitude != null;
    if (!hasCoords && !locationLabel.trim()) {
      setRouteIntel(null);
      return;
    }
    setRouteIntelLoading(true);
    try {
      const body: { latitude?: number; longitude?: number; locationLabel?: string } = {};
      if (latitude != null) body.latitude = latitude;
      if (longitude != null) body.longitude = longitude;
      if (!hasCoords && locationLabel.trim()) body.locationLabel = locationLabel.trim();
      const res = await fetchRouteIntelligence(body);
      setRouteIntel(res);
      setLocationConfidence(res.locationConfidence);
      if (res.latitude != null && res.longitude != null) {
        if (latitude == null) setLatitude(res.latitude);
        if (longitude == null) setLongitude(res.longitude);
      }
      if (res.resolvedPostcode) setPostcode(res.resolvedPostcode);
    } catch {
      setRouteIntel(null);
    } finally {
      setRouteIntelLoading(false);
    }
  }, [latitude, longitude, locationLabel]);

  useEffect(() => {
    if (!latitude || !longitude) return;
    void refreshRouteIntel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  // -------- Price quote (auto on entering Step 3) --------
  const refreshPriceQuote = useCallback(async (): Promise<void> => {
    setPriceLoading(true);
    setPriceError(null);
    try {
      const body: Parameters<typeof fetchQuickPriceQuote>[0] = {
        jobType,
        tyreProblemType: problemType,
      };
      if (jobType === 'REPLACEMENT') {
        if (!selectedStock?.tyreId) {
          setPriceLoading(false);
          setPriceError('Pick a tyre in step 2 to price the replacement.');
          return;
        }
        body.tyreId = selectedStock.tyreId;
      }
      const ml: { addressLine1: string; postcode: string; latitude?: number; longitude?: number } = {
        addressLine1: locationLabel.trim() || 'Roadside (location TBC)',
        postcode: postcode ?? 'G1 1AA',
      };
      if (latitude != null) ml.latitude = latitude;
      if (longitude != null) ml.longitude = longitude;
      body.manualLocation = ml;
      const res = await fetchQuickPriceQuote(body);
      setPriceQuote(res);
      // Refreshing the quote always clears any prior manual edit so the
      // admin sees the new engine/learned suggestion as the starting point.
      setPriceOverrideGbp(null);
    } catch (e) {
      setPriceError(e instanceof ApiError ? e.message : 'Could not calculate price');
      setPriceQuote(null);
    } finally {
      setPriceLoading(false);
    }
  }, [jobType, problemType, selectedStock, locationLabel, latitude, longitude, postcode]);

  useEffect(() => {
    if (step !== 3) return;
    void refreshPriceQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // -------- Validation per step --------
  const stepValid = useMemo((): { ok: boolean; reason?: string } => {
    if (step === 1) {
      if (!locationLabel.trim() && (latitude == null || longitude == null)) {
        return { ok: false, reason: 'Add a location or send a location link.' };
      }
      return { ok: true };
    }
    if (step === 2) {
      if (jobType === 'REPLACEMENT' && !selectedStock) {
        return { ok: false, reason: 'Choose a tyre to replace.' };
      }
      return { ok: true };
    }
    if (step === 3) {
      if (priceLoading) return { ok: false, reason: 'Waiting for price…' };
      if (priceError && !priceQuote) {
        return { ok: false, reason: priceError };
      }
      return { ok: true };
    }
    if (step === 4) {
      // Emergency-first: admin can always submit on step 4. Phone, name,
      // email, and cash-terms checkbox are all optional. The only hard
      // requirement is a phone for card/deposit (Stripe needs an SMS target).
      if (paymentMode !== 'CASH' && customerPhone.trim().length < 7) {
        return { ok: false, reason: 'Phone is required for card / deposit payments.' };
      }
      return { ok: true };
    }
    return { ok: false };
  }, [
    step,
    locationLabel,
    latitude,
    longitude,
    jobType,
    selectedStock,
    priceLoading,
    priceError,
    priceQuote,
    customerPhone,
    paymentMode,
    cashTermsConfirmed,
  ]);

  // -------- Readiness score for dispatch --------
  const readiness = useMemo(() => computeReadiness({
    locationConfidence,
    safetyStatus,
    jobType,
    selectedStock,
    lockingNut,
    paymentMode,
    cashTermsConfirmed,
    customerPhone,
  }), [
    locationConfidence,
    safetyStatus,
    jobType,
    selectedStock,
    lockingNut,
    paymentMode,
    cashTermsConfirmed,
    customerPhone,
  ]);

  // -------- Submit (final create on step 4) --------
  const submit = useCallback(async (): Promise<void> => {
    setError(null);
    setSubmitting(true);
    try {
      const richNote = buildStructuredNote({
        baseNote: internalNote,
        source: props.prefill?.source ?? null,
        callClickEventId: props.prefill?.callClickEventId ?? null,
        emergencyAssistEventId: props.prefill?.emergencyAssistEventId ?? null,
        vehicleRegistration: props.prefill?.vehicleRegistration ?? null,
        safetyStatus,
        locationConfidence,
        tyreSize,
        selectedStock,
        paymentMode,
        balanceMethod,
        priceQuote,
        readiness,
        routeIntel,
      });
      const payload: QuickBookingInput = {
        jobType,
        problemType,
        lockingWheelNutStatus:
          lockingNut === 'UNSURE' ? 'STANDARD_ONLY' : lockingNut,
        source: props.prefill?.source ?? 'ADMIN_QUICK_BOOKING',
        paymentMode,
      };
      if (customerPhone.trim()) payload.customerPhone = customerPhone.trim();
      if (customerName.trim()) payload.customerName = customerName.trim();
      if (customerEmail.trim()) payload.customerEmail = customerEmail.trim();
      if (locationLabel.trim()) payload.locationLabel = locationLabel.trim();
      if (latitude != null) payload.latitude = latitude;
      if (longitude != null) payload.longitude = longitude;
      if (richNote) payload.internalNote = richNote;
      // Snapshot the live price total so the backend can compute the deposit
      // / balance amounts and prepare a Stripe Payment Element URL. We send
      // the admin-edited override (if any) as the booking total, and the
      // original engine value so the backend can record the learning sample.
      const engineTotalGbp = priceQuote?.engineTotalPriceGbp ?? priceQuote?.pricing.totalPriceGbp;
      const overrideNum = priceOverrideGbp ? Number(priceOverrideGbp) : null;
      const overrideValid = overrideNum != null && Number.isFinite(overrideNum) && overrideNum > 0;
      const effectiveTotalGbp = overrideValid
        ? overrideNum.toFixed(2)
        : priceQuote?.pricing.totalPriceGbp ?? null;
      const wasOverridden =
        overrideValid && engineTotalGbp != null && Number(engineTotalGbp).toFixed(2) !== overrideNum.toFixed(2);

      if (paymentMode !== 'CASH' && effectiveTotalGbp) {
        payload.totalPriceGbp = effectiveTotalGbp;
      } else if (effectiveTotalGbp) {
        // CASH: still send so the backend can record the learning sample.
        payload.totalPriceGbp = effectiveTotalGbp;
      }
      if (engineTotalGbp) {
        payload.engineTotalPriceGbp = Number(engineTotalGbp).toFixed(2);
      }
      if (wasOverridden) payload.priceOverridden = true;
      const milesFromQuote =
        (priceQuote?.pricing.breakdown as { distance?: { distanceMiles?: number | null } } | undefined)
          ?.distance?.distanceMiles ?? null;
      if (milesFromQuote != null && Number.isFinite(milesFromQuote)) {
        payload.distanceMiles = milesFromQuote;
      }
      if (selectedStock?.tyreId) {
        // Use a type assertion since QuickBookingInput.tyreId existed before
        // and the backend now uses it for the override record too.
        (payload as { tyreId?: string }).tyreId = selectedStock.tyreId;
      }
      const res = await createQuickBooking(payload);
      setSuccess(res);
      void clearQuickBookingDraft();
      void playSound('payment_received', { volume: 0.5 });
      toast.celebrate(`Booking created · ${res.trackingId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create booking');
      toast.show('Could not create booking', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [
    customerPhone,
    customerName,
    customerEmail,
    locationLabel,
    latitude,
    longitude,
    internalNote,
    jobType,
    problemType,
    lockingNut,
    safetyStatus,
    locationConfidence,
    tyreSize,
    selectedStock,
    paymentMode,
    balanceMethod,
    priceQuote,
    priceOverrideGbp,
    readiness,
    routeIntel,
    props.prefill?.source,
    props.prefill?.callClickEventId,
    props.prefill?.emergencyAssistEventId,
    props.prefill?.vehicleRegistration,
    toast,
  ]);

  const goNext = useCallback(() => {
    if (!stepValid.ok) {
      if (stepValid.reason) toast.show(stepValid.reason, 'warning');
      return;
    }
    if (step < 4) setStep(((step + 1) as StepId));
  }, [stepValid, step, toast]);
  const goBack = useCallback(() => {
    if (step > 1) setStep(((step - 1) as StepId));
  }, [step]);

  // -------- Success card actions --------
  const sendPaymentLink = useCallback(async (): Promise<void> => {
    if (!success) return;
    try {
      await apiPost(`/api/admin/bookings/${success.bookingId}/send-payment-link`, {
        method: 'sms',
        paymentPurpose: 'booking',
      });
      toast.show('Payment link SMS sent', 'success');
    } catch (e) {
      toast.show(
        e instanceof ApiError ? e.message : 'Could not send payment link',
        'error',
      );
    }
  }, [success, toast]);

  const sendLocationLink = useCallback(async (): Promise<void> => {
    if (!success) return;
    try {
      await sendLocationRequest(success.bookingId);
      toast.show('Location link SMS sent', 'success');
    } catch (e) {
      toast.show(
        e instanceof ApiError ? e.message : 'Could not send location link',
        'error',
      );
    }
  }, [success, toast]);

  const copyBookingDetails = useCallback(async (): Promise<void> => {
    const totalGbp = priceQuote ? Number(priceQuote.pricing.totalPriceGbp) : null;
    const depositGbp =
      success?.depositAmountGbp != null
        ? Number(success.depositAmountGbp)
        : totalGbp != null && paymentMode === 'DEPOSIT'
          ? Math.round(totalGbp * 0.15 * 100) / 100
          : null;
    const balanceGbp =
      success?.balanceDueGbp != null
        ? Number(success.balanceDueGbp)
        : totalGbp != null
          ? paymentMode === 'FULL'
            ? 0
            : paymentMode === 'DEPOSIT' && depositGbp != null
              ? Math.round((totalGbp - depositGbp) * 100) / 100
              : totalGbp
          : null;

    // Paid vs unpaid. Pre-creation nothing is taken yet. Post-creation only
    // FULL is paid in full; DEPOSIT is paid only if the admin opened the
    // payment URL — we can't confirm that from JS so we report it as pending.
    let paidStatus: string;
    if (!success) {
      paidStatus = 'Not paid yet (booking not created)';
    } else if (paymentMode === 'FULL') {
      paidStatus = 'PAID IN FULL (card)';
    } else if (paymentMode === 'DEPOSIT') {
      paidStatus =
        depositGbp != null
          ? `Deposit £${depositGbp.toFixed(2)} pending — take on card`
          : 'Deposit pending';
    } else {
      paidStatus = 'Unpaid · cash on site';
    }

    const driverCollects =
      balanceGbp != null ? `£${balanceGbp.toFixed(2)}` : 'TBC';
    const driverMethod =
      paymentMode === 'CASH'
        ? 'cash'
        : paymentMode === 'DEPOSIT'
          ? 'card or cash (balance)'
          : 'nothing — already paid';

    const lines = [
      success
        ? `TyreRepair UK · Booking ${success.trackingId}`
        : 'TyreRepair UK · Draft booking (not yet created)',
      `Phone: ${customerPhone || '—'}`,
      customerName ? `Name: ${customerName}` : null,
      customerEmail ? `Email: ${customerEmail}` : null,
      `Job: ${jobType}${problemType !== 'NOT_SURE' ? ` (${problemType})` : ''}`,
      tyreSize ? `Tyre: ${tyreSize}` : null,
      `Locking nut: ${lockingNut}`,
      locationLabel ? `Location: ${locationLabel}` : null,
      latitude != null && longitude != null
        ? `Coords: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        : null,
      routeIntel?.distanceMiles != null
        ? `Distance: ${routeIntel.distanceMiles.toFixed(1)} mi · drive ${Math.round(routeIntel.durationMinutes ?? 0)} min`
        : null,
      '',
      '— Payment —',
      `Method: ${paymentMode}`,
      totalGbp != null
        ? `Total: £${totalGbp.toFixed(2)}${jobType === 'ASSESSMENT' ? ' (assessment)' : ''}`
        : 'Total: TBC',
      depositGbp != null ? `Deposit (15%): £${depositGbp.toFixed(2)}` : null,
      `Status: ${paidStatus}`,
      `Driver collects: ${driverCollects} (${driverMethod})`,
      internalNote ? `\nNote: ${internalNote}` : null,
    ].filter((s): s is string => s !== null);
    const ok = await copyToClipboard(lines.join('\n'));
    if (ok) {
      toast.success('Booking details copied');
    } else {
      toast.error('Copy failed');
    }
  }, [
    success,
    customerPhone,
    customerName,
    customerEmail,
    jobType,
    problemType,
    tyreSize,
    lockingNut,
    locationLabel,
    latitude,
    longitude,
    routeIntel,
    paymentMode,
    priceQuote,
    internalNote,
    toast,
  ]);

  const openExternalNav = useCallback((): void => {
    const url = routeIntel?.externalNavigationUrl;
    if (url) void Linking.openURL(url);
  }, [routeIntel?.externalNavigationUrl]);

  const reset = useCallback((): void => {
    setStep(1);
    setLocationLabel('');
    setLatitude(null);
    setLongitude(null);
    setPostcode(null);
    setLocationConfidence('MISSING_LOCATION');
    setSafetyStatus('UNKNOWN');
    setRouteIntel(null);
    setJobType('ASSESSMENT');
    setProblemType('NOT_SURE');
    setTyreSize('');
    setSelectedStock(null);
    setLockingNut('STANDARD_ONLY');
    setPriceQuote(null);
    setShowBreakdown(false);
    setPriceOverrideGbp(null);
    setCustomerPhone('');
    setCustomerName('');
    setCustomerEmail('');
    setInternalNote('');
    setPaymentMode('CASH');
    setBalanceMethod('PAYMENT_LINK_LATER');
    setCashTermsConfirmed(false);
    setCustomerLookup(null);
    setSuccess(null);
    setError(null);
    void clearQuickBookingDraft();
  }, []);

  // -------- Render --------
  if (success) {
    return (
      <AppShell>
        <ScreenHeader
          title="Booking created"
          subtitle={`Tracking ${success.trackingId} · payment not yet taken`}
        />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
          <GoldCard tone="success" priority="high" icon="✓" title={`Tracking ${success.trackingId}`}>
            <Text className="text-text-muted text-xs mt-1">
              Pending payment · {jobType} · {paymentMode}
            </Text>
            <View className="flex-row flex-wrap gap-2 mt-3">
              <AdminButton
                label="Open booking"
                variant="primary"
                size="md"
                onPress={(): void => {
                  router.push({
                    pathname: '/bookings/[bookingId]',
                    params: { bookingId: success.bookingId },
                  });
                }}
              />
              {success.paymentUrl ? (
                <AdminButton
                  label={
                    success.paymentMode === 'DEPOSIT'
                      ? `Take 15% deposit on card${success.depositAmountGbp ? ` · £${Number(success.depositAmountGbp).toFixed(2)}` : ''}`
                      : `Take card payment now${success.balanceDueGbp ? ` · £${Number(success.balanceDueGbp).toFixed(2)}` : ''}`
                  }
                  variant="primary"
                  size="md"
                  onPress={() => {
                    if (success.paymentUrl) {
                      void Linking.openURL(success.paymentUrl);
                    }
                  }}
                />
              ) : null}
              <AdminButton
                label="Send payment link"
                variant="secondary"
                size="md"
                onPress={() => void sendPaymentLink()}
              />
              <AdminButton
                label="Send location link"
                variant="secondary"
                size="md"
                onPress={() => void sendLocationLink()}
              />
              <AdminButton
                label="Copy booking details"
                variant="ghost"
                size="md"
                onPress={() => void copyBookingDetails()}
              />
              {routeIntel?.externalNavigationUrl ? (
                <AdminButton
                  label="Open navigation"
                  variant="ghost"
                  size="md"
                  onPress={openExternalNav}
                />
              ) : null}
              <AdminButton
                label="Create another"
                variant="ghost"
                size="md"
                onPress={reset}
              />
            </View>
          </GoldCard>

          <GoldCard title="Suggested SMS to customer" icon="✉">
            <Text className="text-text-muted text-xs leading-5">
              {composeTrackingSmsTemplate({
                trackingId: success.trackingId,
                jobType,
                paymentMode,
              })}
            </Text>
            <View className="mt-2">
              <AdminButton
                label="Copy SMS"
                variant="secondary"
                size="sm"
                onPress={async (): Promise<void> => {
                  const msg = composeTrackingSmsTemplate({
                    trackingId: success.trackingId,
                    jobType,
                    paymentMode,
                  });
                  const ok = await copyToClipboard(msg);
                  if (ok) toast.success('SMS copied');
                  else toast.error('Copy failed');
                }}
              />
            </View>
          </GoldCard>
        </ScrollView>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScreenHeader
        title="Quick Booking"
        subtitle={`Step ${step} of 4 · ${STEP_TITLES[step]}`}
      />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
        <StepProgress step={step} />

        {/* Persistent helpers — readiness + call script */}
        <GoldCard
          tone={readiness.tone}
          icon={readiness.icon}
          eyebrow="Dispatch readiness"
          title={readiness.label}
          headerRight={
            <Pressable onPress={() => setShowCallScript((v) => !v)}>
              <Text className="text-gold text-[11px] font-semibold">
                {showCallScript ? 'Hide script' : 'Call script'}
              </Text>
            </Pressable>
          }
        >
          {readiness.reasons.length > 0 ? (
            <View className="mt-1">
              {readiness.reasons.map((r) => (
                <Text key={r} className="text-text-muted text-[11px]">
                  • {r}
                </Text>
              ))}
            </View>
          ) : null}
          {showCallScript ? <CallScript /> : null}
        </GoldCard>

        {step === 1 ? (
          <Step1Location
            locationLabel={locationLabel}
            setLocationLabel={setLocationLabel}
            latitude={latitude}
            longitude={longitude}
            setCoords={(la, lo) => {
              setLatitude(la);
              setLongitude(lo);
            }}
            setPostcode={setPostcode}
            safetyStatus={safetyStatus}
            setSafetyStatus={setSafetyStatus}
            routeIntel={routeIntel}
            routeIntelLoading={routeIntelLoading}
            refreshRouteIntel={() => void refreshRouteIntel()}
            customerPhone={customerPhone}
            customerEmail={customerEmail}
            customerName={customerName}
            jobType={jobType}
          />
        ) : null}

        {step === 2 ? (
          <Step2Job
            jobType={jobType}
            setJobType={setJobType}
            problemType={problemType}
            setProblemType={setProblemType}
            tyreSize={tyreSize}
            setTyreSize={setTyreSize}
            selectedStock={selectedStock}
            setSelectedStock={setSelectedStock}
            lockingNut={lockingNut}
            setLockingNut={setLockingNut}
          />
        ) : null}

        {step === 3 ? (
          <Step3Price
            jobType={jobType}
            problemType={problemType}
            quote={priceQuote}
            loading={priceLoading}
            error={priceError}
            showBreakdown={showBreakdown}
            setShowBreakdown={setShowBreakdown}
            refresh={() => void refreshPriceQuote()}
            paymentMode={paymentMode}
            setPaymentMode={setPaymentMode}
            priceOverrideGbp={priceOverrideGbp}
            setPriceOverrideGbp={setPriceOverrideGbp}
          />
        ) : null}

        {step === 4 ? (
          <Step4CustomerPayment
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerEmail={customerEmail}
            setCustomerEmail={setCustomerEmail}
            internalNote={internalNote}
            setInternalNote={setInternalNote}
            paymentMode={paymentMode}
            setPaymentMode={setPaymentMode}
            balanceMethod={balanceMethod}
            setBalanceMethod={setBalanceMethod}
            cashTermsConfirmed={cashTermsConfirmed}
            setCashTermsConfirmed={setCashTermsConfirmed}
            lookup={customerLookup}
            lookupLoading={lookupLoading}
            quote={priceQuote}
          />
        ) : null}

        {error ? <Text className="text-danger text-sm">{error}</Text> : null}

        {/* Copy current booking details — works mid-wizard too, so the
            admin can paste into chat/SMS before completion. */}
        <View className="mt-2">
          <AdminButton
            label="Copy booking details"
            variant="ghost"
            size="sm"
            onPress={() => void copyBookingDetails()}
          />
        </View>

        {/* Step navigation */}
        <View className="flex-row gap-2 mt-2">
          {step > 1 ? (
            <AdminButton label="Back" variant="ghost" size="md" onPress={goBack} />
          ) : null}
          <View className="flex-1" />
          {step < 4 ? (
            <AdminButton
              label="Continue"
              variant="primary"
              size="lg"
              onPress={goNext}
              disabled={!stepValid.ok}
            />
          ) : (
            <AdminButton
              label="Create emergency booking"
              loadingLabel="Creating…"
              variant="primary"
              size="lg"
              onPress={() => void submit()}
              loading={submitting}
              disabled={!stepValid.ok}
            />
          )}
        </View>

        <Text className="text-text-dim text-[10px] text-center">
          Draft is auto-saved on this device for 30 minutes. No card details are stored.
        </Text>
      </ScrollView>
    </AppShell>
  );
}

/* ---------------- Step header / progress bar ---------------- */

function StepProgress({ step }: { step: StepId }): React.JSX.Element {
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4].map((n) => (
        <View
          key={n}
          className={`flex-1 h-1.5 rounded-full ${
            n <= step ? 'bg-gold' : 'bg-surfaceMuted'
          }`}
        />
      ))}
    </View>
  );
}

/* ---------------- Step 1: Location ---------------- */

interface Step1Props {
  locationLabel: string;
  setLocationLabel: (v: string) => void;
  latitude: number | null;
  longitude: number | null;
  setCoords: (lat: number, lng: number) => void;
  setPostcode: (p: string | null) => void;
  safetyStatus: SafetyStatus;
  setSafetyStatus: (s: SafetyStatus) => void;
  routeIntel: RouteIntelligenceResponse | null;
  routeIntelLoading: boolean;
  refreshRouteIntel: () => void;
  customerPhone: string;
  customerEmail: string;
  customerName: string;
  jobType: JobType;
}

function Step1Location(p: Step1Props): React.JSX.Element {
  return (
    <>
      <GoldCard title="Where is the customer?" icon="📍" eyebrow="Step 1">
        <MapboxAddressAutocomplete
          initialQuery={p.locationLabel}
          onSelect={(s) => {
            p.setLocationLabel(s.placeName);
            p.setCoords(s.latitude, s.longitude);
            p.setPostcode(s.postcode);
          }}
        />
        <Text className="text-text-dim text-[10px] mt-2">
          If the customer can&apos;t describe their location, finish this booking and tap
          &quot;Send location link&quot; on the success screen.
        </Text>
        {p.latitude != null && p.longitude != null ? (
          <View className="mt-2 px-2 py-1.5 rounded-md bg-surfaceMuted">
            <Text className="text-text-muted text-[11px]">
              Coords captured: {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
            </Text>
          </View>
        ) : null}
      </GoldCard>

      <GoldCard title="Is the customer safe?" icon="🛟" eyebrow="Safety check">
        <View className="flex-row flex-wrap gap-2 mt-1">
          {(
            [
              { k: 'SAFE', label: 'Safe location' },
              { k: 'ROADSIDE', label: 'Roadside / kerb' },
              { k: 'HIGH_RISK', label: 'High risk (motorway)' },
              { k: 'UNKNOWN', label: 'Unknown' },
            ] as const
          ).map((opt) => {
            const active = p.safetyStatus === opt.k;
            return (
              <Pressable
                key={opt.k}
                onPress={() => p.setSafetyStatus(opt.k)}
                className={`rounded-full px-3 py-1.5 border ${
                  active ? 'bg-gold border-gold' : 'border-border bg-surfaceMuted'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-canvas' : 'text-text-muted'
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {p.safetyStatus === 'HIGH_RISK' ? (
          <Text className="text-danger text-[11px] mt-2">
            Tell the customer to leave the vehicle and stand behind the barrier.
          </Text>
        ) : null}
      </GoldCard>

      <LocationRequestPanel
        customerPhone={p.customerPhone}
        customerEmail={p.customerEmail}
        customerName={p.customerName}
        onLocationReceived={(loc) => {
          p.setCoords(loc.latitude, loc.longitude);
          if (!p.locationLabel.trim()) {
            p.setLocationLabel(
              `Customer GPS · ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`,
            );
          }
        }}
      />

      <RouteIntelCard
        intel={p.routeIntel}
        loading={p.routeIntelLoading}
        onRefresh={p.refreshRouteIntel}
        jobType={p.jobType}
      />

      <LiveRouteLine
        customer={
          p.latitude != null && p.longitude != null
            ? { latitude: p.latitude, longitude: p.longitude, label: p.locationLabel }
            : null
        }
        routeIntel={
          p.routeIntel
            ? { distanceMiles: p.routeIntel.distanceMiles, durationMinutes: p.routeIntel.durationMinutes }
            : null
        }
      />
    </>
  );
}

/* ---------------- Step 2: Job ---------------- */

interface Step2Props {
  jobType: JobType;
  setJobType: (v: JobType) => void;
  problemType: ProblemType;
  setProblemType: (v: ProblemType) => void;
  tyreSize: string;
  setTyreSize: (v: string) => void;
  selectedStock: StockItem | null;
  setSelectedStock: (s: StockItem | null) => void;
  lockingNut: LockingNut;
  setLockingNut: (v: LockingNut) => void;
}

function Step2Job(p: Step2Props): React.JSX.Element {
  return (
    <>
      <GoldCard title="What does the customer need?" icon="🔧" eyebrow="Step 2">
        <Text className="text-text-muted text-xs mb-2">Job type</Text>
        <View className="flex-row gap-2">
          {(
            [
              { k: 'ASSESSMENT', label: 'Puncture / not sure', helper: 'We assess and advise' },
              { k: 'REPLACEMENT', label: 'Replacement', helper: 'New tyre fitted on site' },
            ] as const
          ).map((opt) => {
            const active = p.jobType === opt.k;
            return (
              <Pressable
                key={opt.k}
                onPress={() => {
                  p.setJobType(opt.k);
                  if (opt.k === 'ASSESSMENT') p.setSelectedStock(null);
                }}
                className={`flex-1 rounded-lg p-3 border ${
                  active ? 'bg-gold/10 border-gold' : 'border-border bg-surfaceMuted'
                }`}
              >
                <Text className={`text-sm font-semibold ${active ? 'text-gold' : 'text-text'}`}>
                  {opt.label}
                </Text>
                <Text className="text-text-muted text-[11px] mt-0.5">{opt.helper}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="text-text-muted text-xs mt-4 mb-2">Reported problem</Text>
        <ChipRow
          options={[
            { key: 'PUNCTURE_OR_FLAT', label: 'Puncture / flat' },
            { key: 'DAMAGED_OR_BLOWN_OUT', label: 'Damaged / blown' },
            { key: 'SLOW_PRESSURE_LOSS', label: 'Slow leak' },
            { key: 'NEEDS_REPLACEMENT', label: 'Needs replacement' },
            { key: 'NOT_SURE', label: 'Not sure' },
          ]}
          value={p.problemType}
          onChange={(v) => p.setProblemType(v)}
        />
      </GoldCard>

      {p.jobType === 'REPLACEMENT' ? (
        <GoldCard title="Tyre to fit" icon="🛞" eyebrow="Stock">
          {p.selectedStock ? (
            <View className="mb-2 px-3 py-2 rounded-md bg-surfaceMuted">
              <Text className="text-text font-semibold text-sm">
                {p.selectedStock.brand} {p.selectedStock.model} — {p.selectedStock.sizeLabel}
              </Text>
              <Text className="text-text-muted text-[11px]">
                SKU {p.selectedStock.sku} · qty {p.selectedStock.quantityAvailable}
              </Text>
              <Pressable
                onPress={() => {
                  p.setSelectedStock(null);
                  p.setTyreSize('');
                }}
                className="mt-1.5 self-start"
              >
                <Text className="text-gold text-[11px] font-semibold">Change tyre</Text>
              </Pressable>
            </View>
          ) : (
            <TyreSizeAutocomplete
              initialQuery={p.tyreSize}
              onSelect={(it) => {
                p.setSelectedStock(it);
                p.setTyreSize(it.sizeLabel);
              }}
              onClear={() => p.setSelectedStock(null)}
            />
          )}
        </GoldCard>
      ) : null}

      <GoldCard title="Locking wheel nut?" icon="🔑" eyebrow="Avoid wasted trips">
        <ChipRow
          options={[
            { key: 'HAVE_KEY', label: 'Key available' },
            { key: 'NO_KEY', label: 'No key' },
            { key: 'STANDARD_ONLY', label: 'Standard nuts only' },
            { key: 'UNSURE', label: 'Customer unsure' },
          ]}
          value={p.lockingNut}
          onChange={(v) => p.setLockingNut(v)}
        />
        {p.lockingNut === 'NO_KEY' ? (
          <Text className="text-warning text-[11px] mt-2">
            Without the key we may not be able to remove the wheel — bring extraction kit.
          </Text>
        ) : null}
      </GoldCard>
    </>
  );
}

/* ---------------- Step 3: Price ---------------- */

interface Step3Props {
  jobType: JobType;
  problemType: ProblemType;
  quote: QuickPriceQuoteResponse | null;
  loading: boolean;
  error: string | null;
  showBreakdown: boolean;
  setShowBreakdown: (v: boolean) => void;
  refresh: () => void;
  paymentMode: PaymentMode;
  setPaymentMode: (m: PaymentMode) => void;
  priceOverrideGbp: string | null;
  setPriceOverrideGbp: (v: string | null) => void;
}

function Step3Price(p: Step3Props): React.JSX.Element {
  const explain = explainPrice(p.jobType, p.problemType);
  const [editingPrice, setEditingPrice] = React.useState(false);
  const [priceDraft, setPriceDraft] = React.useState('');

  const engineTotal = p.quote?.engineTotalPriceGbp ?? p.quote?.pricing.totalPriceGbp ?? null;
  const suggestedTotal = p.quote?.pricing.totalPriceGbp ?? null;
  const displayedTotal = p.priceOverrideGbp ?? suggestedTotal ?? '';
  const learned = p.quote?.learnedAdjustment ?? null;
  const isOverridden =
    p.priceOverrideGbp != null &&
    engineTotal != null &&
    Number(p.priceOverrideGbp).toFixed(2) !== Number(engineTotal).toFixed(2);

  const beginEdit = (): void => {
    setPriceDraft(displayedTotal || '');
    setEditingPrice(true);
  };
  const commitEdit = (): void => {
    const trimmed = priceDraft.trim();
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) {
      setEditingPrice(false);
      return;
    }
    p.setPriceOverrideGbp(n.toFixed(2));
    setEditingPrice(false);
  };
  const resetOverride = (): void => {
    p.setPriceOverrideGbp(null);
    setEditingPrice(false);
  };

  return (
    <>
      <GoldCard title="Price quote" icon="£" eyebrow="Step 3">
        {p.loading ? (
          <View className="flex-row items-center gap-2 py-2">
            <ActivityIndicator />
            <Text className="text-text-muted text-xs">Calculating price…</Text>
          </View>
        ) : p.error && !p.quote ? (
          <Text className="text-danger text-sm">{p.error}</Text>
        ) : p.quote ? (
          <View>
            {editingPrice ? (
              <View className="gap-2">
                <Text className="text-text-muted text-xs">Edit total (£)</Text>
                <GoldInput
                  value={priceDraft}
                  onChangeText={setPriceDraft}
                  keyboardType="decimal-pad"
                  autoFocus
                  onBlur={commitEdit}
                  onSubmitEditing={commitEdit}
                />
                <View className="flex-row gap-2">
                  <AdminButton label="Save" variant="primary" size="sm" onPress={commitEdit} />
                  <AdminButton
                    label="Cancel"
                    variant="ghost"
                    size="sm"
                    onPress={() => setEditingPrice(false)}
                  />
                </View>
              </View>
            ) : (
              <Pressable onPress={beginEdit} hitSlop={8}>
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-text text-3xl font-bold">
                    £{Number(displayedTotal || 0).toFixed(2)}
                  </Text>
                  <Text className="text-text-muted text-xs">
                    {p.jobType === 'ASSESSMENT' ? 'assessment fee' : 'all-in price'}
                  </Text>
                  <Text className="text-gold text-[11px] ml-1">Tap to edit</Text>
                </View>
              </Pressable>
            )}

            {/* Suggested-by-engine + learned-adjustment hints */}
            {!editingPrice && isOverridden && engineTotal ? (
              <View className="mt-1 flex-row items-center gap-2">
                <Text className="text-text-muted text-[11px]">
                  Edited from £{Number(engineTotal).toFixed(2)}
                </Text>
                <Pressable onPress={resetOverride} hitSlop={6}>
                  <Text className="text-gold text-[11px] font-semibold">Reset</Text>
                </Pressable>
              </View>
            ) : null}
            {!editingPrice && learned ? (
              <Text className="text-text-muted text-[11px] mt-1">
                AI suggestion · {learned.multiplier >= 1 ? '+' : ''}
                {((learned.multiplier - 1) * 100).toFixed(1)}% from engine
                {' '}· based on {learned.sampleSize} admin edits (last {learned.windowDays}d)
              </Text>
            ) : null}

            <View className="flex-row gap-2 mt-3">
              <AdminButton label="Refresh" variant="secondary" size="md" onPress={p.refresh} />
              <AdminButton
                label={p.showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
                variant="ghost"
                size="md"
                onPress={() => p.setShowBreakdown(!p.showBreakdown)}
              />
              {!editingPrice ? (
                <AdminButton label="Edit price" variant="ghost" size="md" onPress={beginEdit} />
              ) : null}
            </View>
            {p.showBreakdown ? (
              <View className="mt-4 pt-3 border-t border-border gap-2">
                <PriceLine label="Base" value={p.quote.pricing.basePriceGbp} />
                {p.jobType === 'REPLACEMENT' ? (
                  <PriceLine label="Tyre" value={p.quote.pricing.multipliedTyrePriceGbp} />
                ) : null}
                <PriceLine label="Distance fee" value={p.quote.pricing.distanceFeeGbp} />
                <View className="h-px bg-border my-1" />
                {engineTotal ? (
                  <PriceLine label="Engine total" value={Number(engineTotal).toFixed(2)} />
                ) : null}
                <PriceLine
                  label={isOverridden ? 'Admin total' : 'Total'}
                  value={Number(displayedTotal || 0).toFixed(2)}
                />
                {p.quote.pricing.breakdown?.notes &&
                p.quote.pricing.breakdown.notes.length > 0 ? (
                  <View className="mt-2 px-3 py-2 rounded-md bg-surfaceMuted">
                    {p.quote.pricing.breakdown.notes.map((n, i) => (
                      <Text key={i} className="text-text-muted text-[11px] leading-5">
                        • {n}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </GoldCard>

      {p.quote ? (
        <PricingSafetySignal
          safety={p.quote.pricingSafety}
          onUseRecommendedPayment={(mode): void => {
            if (mode === 'CASH' || mode === 'DEPOSIT' || mode === 'FULL') {
              p.setPaymentMode(mode);
            }
          }}
          onOverrideWithReason={(): void => {
            // "Manual review" / "Confirm manually" — the admin must record
            // why they are proceeding. We surface the prompt; the admin
            // captures the reason in the Internal note field below before
            // creating the booking.
            Alert.alert(
              'Manual review required',
              'Add an internal note explaining why you are proceeding manually before creating the booking. Make sure the price, payment plan and dispatch are confirmed with the customer.',
            );
          }}
        />
      ) : null}

      {/* Old detached breakdown card removed — now rendered inline above */}

      <GoldCard title="Explain to customer" icon="💬">
        <Text className="text-text-muted text-xs leading-5">{explain}</Text>
      </GoldCard>

      <GoldCard title="Recommended payment plan" icon="💳" eyebrow="Pick now, edit later">
        <View className="gap-2">
          {(
            [
              { k: 'CASH', label: 'Cash on site', helper: 'No card pre-auth — driver collects' },
              { k: 'DEPOSIT', label: '15% deposit now', helper: 'Locks the slot, balance later' },
              { k: 'FULL', label: 'Full payment now', helper: 'No follow-up needed' },
            ] as const
          ).map((opt) => {
            const active = p.paymentMode === opt.k;
            return (
              <Pressable
                key={opt.k}
                onPress={() => p.setPaymentMode(opt.k)}
                className={`rounded-lg p-3 border ${
                  active ? 'bg-gold/10 border-gold' : 'border-border bg-surfaceMuted'
                }`}
              >
                <Text className={`text-sm font-semibold ${active ? 'text-gold' : 'text-text'}`}>
                  {opt.label}
                </Text>
                <Text className="text-text-muted text-[11px] mt-0.5">{opt.helper}</Text>
              </Pressable>
            );
          })}
        </View>
      </GoldCard>
    </>
  );
}

function PriceLine({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View className="flex-row justify-between">
      <Text className="text-text-muted text-xs">{label}</Text>
      <Text className="text-text text-xs font-semibold">£{value}</Text>
    </View>
  );
}

function TimeRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}): React.JSX.Element {
  return (
    <View className="flex-row justify-between py-0.5">
      <Text
        className={`text-[11px] ${bold ? 'text-text font-semibold' : 'text-text-muted'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text className={`text-[11px] ${bold ? 'text-gold font-bold' : 'text-text font-semibold'}`}>
        {value}
      </Text>
    </View>
  );
}

function fmtMin(mins: number | null): string {
  if (mins == null || !Number.isFinite(mins)) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/* ---------------- Step 4: Customer & payment ---------------- */

interface Step4Props {
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerEmail: string;
  setCustomerEmail: (v: string) => void;
  internalNote: string;
  setInternalNote: (v: string) => void;
  paymentMode: PaymentMode;
  setPaymentMode: (m: PaymentMode) => void;
  balanceMethod: BalanceMethod;
  setBalanceMethod: (b: BalanceMethod) => void;
  cashTermsConfirmed: boolean;
  setCashTermsConfirmed: (v: boolean) => void;
  lookup: CustomerLookupResponse | null;
  lookupLoading: boolean;
  quote: QuickPriceQuoteResponse | null;
}

function Step4CustomerPayment(p: Step4Props): React.JSX.Element {
  return (
    <>
      <GoldCard title="Customer" icon="👤" eyebrow="Step 4">
        <View className="gap-3">
          <GoldInput
            label="Phone (recommended — leave blank for emergency)"
            value={p.customerPhone}
            onChangeText={p.setCustomerPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          {p.lookupLoading ? (
            <Text className="text-text-muted text-[11px]">Checking customer…</Text>
          ) : p.lookup?.found && p.lookup.customer ? (
            <View className="px-3 py-2 rounded-md bg-info/10 border border-info/30">
              <Text className="text-info text-xs font-semibold">
                Returning customer — {p.lookup.customer.bookingsCount} previous booking
                {p.lookup.customer.bookingsCount === 1 ? '' : 's'}
              </Text>
              {p.lookup.lastBooking ? (
                <Text className="text-text-muted text-[11px] mt-0.5">
                  Last: {p.lookup.lastBooking.trackingId} · {p.lookup.lastBooking.status}
                </Text>
              ) : null}
              {p.lookup.riskNotes.length > 0 ? (
                <View className="mt-1.5">
                  {p.lookup.riskNotes.map((rn) => (
                    <Text key={rn.id} className="text-warning text-[11px]">
                      ⚠ {rn.noteType}: {rn.body}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
          <GoldInput
            label="Customer name (optional)"
            value={p.customerName}
            onChangeText={p.setCustomerName}
          />
          <GoldInput
            label="Email (optional)"
            value={p.customerEmail}
            onChangeText={p.setCustomerEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <GoldInput
            label="Internal note (optional)"
            value={p.internalNote}
            onChangeText={p.setInternalNote}
            multiline
          />
        </View>
      </GoldCard>

      <GoldCard title="Payment" icon="💳" tone={p.paymentMode === 'CASH' ? 'warning' : 'default'}>
        <View className="gap-2">
          {(
            [
              { k: 'CASH', label: 'Cash on site' },
              { k: 'DEPOSIT', label: '15% deposit now' },
              { k: 'FULL', label: 'Full payment now' },
            ] as const
          ).map((opt) => {
            const active = p.paymentMode === opt.k;
            return (
              <Pressable
                key={opt.k}
                onPress={() => p.setPaymentMode(opt.k)}
                className={`rounded-lg p-3 border ${
                  active ? 'bg-gold/10 border-gold' : 'border-border bg-surfaceMuted'
                }`}
              >
                <Text className={`text-sm font-semibold ${active ? 'text-gold' : 'text-text'}`}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {p.paymentMode === 'CASH' ? (
          <>
            <Text className="text-text-muted text-[11px] leading-5 mt-3">
              No online payment collected. Confirm payment terms with the customer before dispatch.
            </Text>
            <Pressable
              onPress={() => p.setCashTermsConfirmed(!p.cashTermsConfirmed)}
              className="mt-2 flex-row items-center gap-2"
            >
            <View
              className={`w-5 h-5 rounded border ${
                p.cashTermsConfirmed ? 'bg-gold border-gold' : 'border-border bg-surface'
              } items-center justify-center`}
            >
              {p.cashTermsConfirmed ? (
                <Text className="text-canvas text-xs font-bold">✓</Text>
              ) : null}
            </View>
            <Text className="text-text-muted text-xs flex-1">
              I confirmed cash payment terms with the customer.
            </Text>
          </Pressable>
          </>
        ) : null}

        {p.paymentMode === 'DEPOSIT' ? (
          <View className="mt-3">
            <Text className="text-text-muted text-xs mb-2">How will the balance be collected?</Text>
            <ChipRow
              options={[
                { key: 'PAYMENT_LINK_LATER', label: 'SMS link later' },
                { key: 'CASH_ON_SITE', label: 'Cash on site' },
                { key: 'CARD_ON_SITE', label: 'Card on site' },
              ]}
              value={p.balanceMethod}
              onChange={p.setBalanceMethod}
            />
          </View>
        ) : null}

        {p.quote ? (
          <View className="mt-3 px-3 py-2 rounded-md bg-surfaceMuted">
            <Text className="text-text-muted text-[11px]">Quote summary</Text>
            <View className="flex-row justify-between mt-0.5">
              <Text className="text-text text-sm font-semibold">
                Total £{p.quote.pricing.totalPriceGbp}
              </Text>
              {p.paymentMode === 'DEPOSIT' ? (
                <Text className="text-gold text-xs font-semibold">
                  Deposit £{(Number(p.quote.pricing.totalPriceGbp) * 0.15).toFixed(2)}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </GoldCard>
    </>
  );
}

/* ---------------- Helper components ---------------- */

function ChipRow<T extends string>(props: {
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T | '';
  onChange: (v: T) => void;
}): React.JSX.Element {
  return (
    <View className="flex-row flex-wrap gap-2">
      {props.options.map((o) => {
        const active = props.value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => props.onChange(o.key)}
            className={`rounded-full px-3 py-1.5 border ${
              active ? 'bg-gold border-gold' : 'border-border bg-surfaceMuted'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                active ? 'text-canvas' : 'text-text-muted'
              }`}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function RouteIntelCard(props: {
  intel: RouteIntelligenceResponse | null;
  loading: boolean;
  onRefresh: () => void;
  jobType: JobType;
}): React.JSX.Element | null {
  const toast = useToast();
  if (!props.intel && !props.loading) return null;
  const intel = props.intel;
  const trafficColour =
    intel?.trafficLabel === 'HIGH'
      ? 'text-danger'
      : intel?.trafficLabel === 'MODERATE'
        ? 'text-warning'
        : intel?.trafficLabel === 'LOW'
          ? 'text-success'
          : 'text-text-muted';
  // Time breakdown estimate (minutes).
  const driveOne = intel?.durationMinutes != null ? Math.round(intel.durationMinutes) : null;
  // Typical on-site time per job type (rough mobile-fitter averages).
  const onSiteMins = props.jobType === 'REPLACEMENT' ? 35 : 20;
  const totalMins =
    driveOne != null ? driveOne + onSiteMins + driveOne : null;
  return (
    <GoldCard title="Route intelligence" icon="🧭" eyebrow="Drive estimate">
      {props.loading ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" />
          <Text className="text-text-muted text-xs">Calculating route…</Text>
        </View>
      ) : intel ? (
        <View>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-text-muted text-[10px] uppercase">Distance</Text>
              <Text className="text-text text-lg font-bold">
                {intel.distanceMiles != null ? `${intel.distanceMiles.toFixed(1)} mi` : '—'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-text-muted text-[10px] uppercase">Drive (one way)</Text>
              <Text className="text-text text-lg font-bold">
                {driveOne != null ? `${driveOne} min` : '—'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-text-muted text-[10px] uppercase">Traffic</Text>
              <Text className={`text-lg font-bold ${trafficColour}`}>{intel.trafficLabel}</Text>
            </View>
          </View>

          {/* Time breakdown: arrive → work → return → total */}
          <View className="mt-3 px-3 py-2 rounded-md bg-surfaceMuted">
            <Text className="text-text-muted text-[10px] uppercase mb-1">Time breakdown</Text>
            <TimeRow label="Drive to customer" value={fmtMin(driveOne)} />
            <TimeRow
              label={`On-site work (${props.jobType === 'REPLACEMENT' ? 'replacement' : 'assessment'}, approx)`}
              value={fmtMin(onSiteMins)}
            />
            <TimeRow label="Drive back to base" value={fmtMin(driveOne)} />
            <View className="h-px bg-border my-1" />
            <TimeRow label="Total round trip" value={fmtMin(totalMins)} bold />
          </View>

          {intel.resolvedAddress ? (
            <Text className="text-text-muted text-[11px] mt-2" numberOfLines={2}>
              📍 {intel.resolvedAddress}
            </Text>
          ) : null}
          {intel.warnings.length > 0 ? (
            <View className="mt-2">
              {intel.warnings.map((w) => (
                <Text key={w} className="text-warning text-[11px]">
                  ⚠ {w}
                </Text>
              ))}
            </View>
          ) : null}
          <View className="flex-row gap-2 mt-3 flex-wrap">
            <AdminButton label="Refresh" variant="secondary" size="md" onPress={props.onRefresh} />
            {intel.externalNavigationUrl ? (
              <AdminButton
                label="Open in Google Maps"
                variant="ghost"
                size="md"
                onPress={() => void Linking.openURL(intel.externalNavigationUrl ?? '')}
              />
            ) : null}
            {intel.resolvedAddress ? (
              <AdminButton
                label="Copy address"
                variant="ghost"
                size="md"
                onPress={async (): Promise<void> => {
                  const ok = await copyToClipboard(intel.resolvedAddress ?? '');
                  if (ok) toast.success('Address copied');
                  else toast.error('Copy failed');
                }}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </GoldCard>
  );
}

function CallScript(): React.JSX.Element {
  return (
    <View className="mt-2 px-3 py-2 rounded-md bg-surfaceMuted">
      <Text className="text-text-muted text-[11px] leading-5">
        1. &quot;Are you in a safe place right now?&quot;{'\n'}
        2. &quot;What&apos;s your phone number in case we get cut off?&quot;{'\n'}
        3. &quot;Where exactly are you? Postcode or landmark.&quot;{'\n'}
        4. &quot;What&apos;s happened to the tyre?&quot;{'\n'}
        5. &quot;Do you have the locking wheel nut key?&quot;{'\n'}
        6. &quot;Cash on site, deposit now, or pay in full?&quot;
      </Text>
    </View>
  );
}

/* ---------------- Helpers ---------------- */

function isProblemType(v: string): v is ProblemType {
  return (
    v === 'PUNCTURE_OR_FLAT' ||
    v === 'DAMAGED_OR_BLOWN_OUT' ||
    v === 'SLOW_PRESSURE_LOSS' ||
    v === 'NEEDS_REPLACEMENT' ||
    v === 'NOT_SURE'
  );
}

function isLockingNut(v: string): v is LockingNut {
  return v === 'HAVE_KEY' || v === 'NO_KEY' || v === 'STANDARD_ONLY' || v === 'UNSURE';
}

function explainPrice(jobType: JobType, _problem: ProblemType): string {
  if (jobType === 'ASSESSMENT') {
    return (
      "This is for an emergency assessment. If the tyre needs replacing, we'll " +
      'confirm the replacement cost before fitting.'
    );
  }
  return 'This includes the selected tyre, fitting and the call-out distance.';
}

interface ReadinessResult {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
  icon: string;
  reasons: string[];
}

function computeReadiness(args: {
  locationConfidence: LocationConfidence;
  safetyStatus: SafetyStatus;
  jobType: JobType;
  selectedStock: StockItem | null;
  lockingNut: LockingNut;
  paymentMode: PaymentMode;
  cashTermsConfirmed: boolean;
  customerPhone: string;
}): ReadinessResult {
  const reasons: string[] = [];
  if (args.locationConfidence === 'MISSING_LOCATION') {
    reasons.push('No location captured yet');
  } else if (args.locationConfidence === 'WEAK_ADDRESS') {
    reasons.push('Address is approximate — consider sending a location link');
  }
  if (args.safetyStatus === 'UNKNOWN') reasons.push('Safety status not confirmed');
  if (args.safetyStatus === 'HIGH_RISK') reasons.push('High-risk location — escalate');
  if (args.jobType === 'REPLACEMENT' && !args.selectedStock) {
    reasons.push('No tyre selected for replacement');
  }
  if (args.lockingNut === 'NO_KEY') reasons.push('No locking nut key — bring extractor');
  if (args.lockingNut === 'UNSURE') reasons.push('Customer unsure about locking nut');
  if (args.customerPhone.trim().length < 7) reasons.push('Customer phone missing');
  if (args.paymentMode === 'CASH' && !args.cashTermsConfirmed) {
    reasons.push('Cash terms not yet confirmed');
  }

  if (reasons.length === 0) {
    return { label: 'Ready to dispatch', tone: 'success', icon: '✓', reasons };
  }
  if (reasons.some((r) => r.includes('High-risk') || r.includes('phone missing'))) {
    return { label: 'Needs confirmation', tone: 'danger', icon: '!', reasons };
  }
  return { label: 'Almost ready', tone: 'warning', icon: '⚠', reasons };
}

function buildStructuredNote(args: {
  baseNote: string;
  source: string | null;
  callClickEventId: string | null;
  emergencyAssistEventId: string | null;
  vehicleRegistration: string | null;
  safetyStatus: SafetyStatus;
  locationConfidence: LocationConfidence;
  tyreSize: string;
  selectedStock: StockItem | null;
  paymentMode: PaymentMode;
  balanceMethod: BalanceMethod;
  priceQuote: QuickPriceQuoteResponse | null;
  readiness: ReadinessResult;
  routeIntel: RouteIntelligenceResponse | null;
}): string {
  // Human-readable summary (admin = human, not developer). The ID fields
  // (stockId/tyreId/eventIds) are intentionally omitted from this note —
  // they are stored on the booking row itself and shown in their own UI.
  const lines: string[] = ['Booking summary'];

  // Source / origin.
  const sourceLabel = humanSourceLabel(args.source);
  if (sourceLabel) lines.push(`• Source: ${sourceLabel}`);
  if (args.vehicleRegistration) lines.push(`• Vehicle reg: ${args.vehicleRegistration}`);

  // Tyre.
  if (args.tyreSize) {
    const stockSuffix = args.selectedStock?.brand
      ? ` — selected ${args.selectedStock.brand}${args.selectedStock.model ? ` ${args.selectedStock.model}` : ''}`
      : '';
    lines.push(`• Tyre: ${args.tyreSize}${stockSuffix}`);
  }

  // Location confidence.
  lines.push(`• Location: ${humanLocationConfidence(args.locationConfidence)}`);

  // Distance & traffic.
  if (args.routeIntel?.distanceMiles != null || args.routeIntel?.durationMinutes != null) {
    const parts: string[] = [];
    if (args.routeIntel.distanceMiles != null) {
      parts.push(`${args.routeIntel.distanceMiles.toFixed(1)} mi`);
    }
    if (args.routeIntel.durationMinutes != null) {
      parts.push(`${Math.round(args.routeIntel.durationMinutes)} min drive`);
    }
    if (args.routeIntel.trafficLabel) {
      parts.push(`${args.routeIntel.trafficLabel.toLowerCase()} traffic`);
    }
    lines.push(`• Distance: ${parts.join(', ')}`);
  }

  // Price.
  if (args.priceQuote) {
    const total = `£${Number(args.priceQuote.pricing.totalPriceGbp).toFixed(2)}`;
    const distFee = args.priceQuote.pricing.distanceFeeGbp
      ? ` (incl. £${Number(args.priceQuote.pricing.distanceFeeGbp).toFixed(2)} distance fee)`
      : '';
    lines.push(`• Price quoted: ${total}${distFee}`);
  }

  // Payment plan.
  const paymentLabel =
    args.paymentMode === 'CASH'
      ? 'Cash on site'
      : args.paymentMode === 'DEPOSIT'
        ? `15% deposit on card${
            args.balanceMethod === 'CASH_ON_SITE'
              ? ', balance in cash on site'
              : args.balanceMethod === 'CARD_ON_SITE'
                ? ', balance on card on site'
                : ', balance via payment link later'
          }`
        : 'Full payment on card';
  lines.push(`• Payment: ${paymentLabel}`);

  // Safety + readiness in plain English.
  if (args.safetyStatus !== 'SAFE') {
    lines.push(`• Safety check: ${humanSafetyStatus(args.safetyStatus)}`);
  }
  if (args.readiness.tone !== 'success' && args.readiness.reasons.length > 0) {
    const toneLabel =
      args.readiness.tone === 'warning' ? 'Heads up' : 'Action required';
    lines.push(`• ${toneLabel}: ${args.readiness.reasons.join('; ')}`);
  }

  const header = lines.join('\n');
  if (args.baseNote.trim()) {
    return `${header}\n\n${args.baseNote.trim()}`;
  }
  return header;
}

function humanSourceLabel(source: string | null): string | null {
  if (!source) return null;
  switch (source) {
    case 'ADMIN_QUICK_BOOKING':
      return 'Admin Quick Booking';
    case 'CALL_CLICK':
      return 'Phone call (click-to-call)';
    case 'EMERGENCY_ASSIST':
      return 'Emergency Assist';
    default:
      return source.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }
}

function humanLocationConfidence(c: LocationConfidence): string {
  switch (c) {
    case 'CONFIRMED_ADDRESS':
      return 'Confirmed address';
    case 'GPS_ONLY':
      return 'GPS pin only';
    case 'WEAK_ADDRESS':
      return 'Approximate address (consider confirming)';
    case 'MISSING_LOCATION':
    default:
      return 'Not yet captured';
  }
}

function humanSafetyStatus(s: SafetyStatus): string {
  switch (s) {
    case 'SAFE':
      return 'Safe location confirmed';
    case 'ROADSIDE':
      return 'Roadside — proceed with caution';
    case 'HIGH_RISK':
      return 'High risk — recovery may be needed';
    case 'UNKNOWN':
    default:
      return 'Not yet confirmed by customer';
  }
}

function composeTrackingSmsTemplate(args: {
  trackingId: string;
  jobType: JobType;
  paymentMode: PaymentMode;
}): string {
  const base = `TyreRepair UK: thanks for your call. Your booking ref is ${args.trackingId}.`;
  if (args.jobType === 'ASSESSMENT') {
    return `${base} A technician will be dispatched once payment is confirmed. We'll inspect the tyre on site and advise next steps. We'll text you when on the way.`;
  }
  if (args.paymentMode === 'CASH') {
    return `${base} Please have payment ready when our technician arrives. We'll text you when on the way.`;
  }
  if (args.paymentMode === 'DEPOSIT') {
    return `${base} Your deposit reserves the slot. We'll text a payment link shortly and another when our technician is on the way.`;
  }
  return `${base} We'll text you once the technician is on the way.`;
}
