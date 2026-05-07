import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { QuickBookingWizard } from '@/components/quick-booking/QuickBookingWizard';

/**
 * Quick Booking entry point — renders the 4-step wizard. All optional URL
 * params are forwarded as prefill (call-click popup, emergency assist popup,
 * action-queue dispatch, etc.).
 */
export default function QuickBookingScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{
    source?: string;
    callClickEventId?: string;
    emergencyAssistEventId?: string;
    phone?: string;
    customerName?: string;
    tyreProblemType?: string;
    jobType?: string;
    locationLabel?: string;
    postcode?: string;
    latitude?: string;
    longitude?: string;
    vehicleRegistration?: string;
    prefillSource?: string;
  }>();

  const lat =
    typeof params.latitude === 'string' && params.latitude
      ? Number(params.latitude)
      : undefined;
  const lng =
    typeof params.longitude === 'string' && params.longitude
      ? Number(params.longitude)
      : undefined;

  const fullLabel =
    [
      typeof params.locationLabel === 'string' ? params.locationLabel : '',
      typeof params.postcode === 'string' ? params.postcode : '',
    ]
      .filter((s) => s && s.length > 0)
      .join(' — ') || undefined;

  const prefill: NonNullable<React.ComponentProps<typeof QuickBookingWizard>['prefill']> = {};
  if (typeof params.source === 'string' && params.source) prefill.source = params.source;
  else if (typeof params.prefillSource === 'string' && params.prefillSource) {
    prefill.source = params.prefillSource;
  }
  if (typeof params.callClickEventId === 'string' && params.callClickEventId) {
    prefill.callClickEventId = params.callClickEventId;
  }
  if (typeof params.emergencyAssistEventId === 'string' && params.emergencyAssistEventId) {
    prefill.emergencyAssistEventId = params.emergencyAssistEventId;
  }
  if (typeof params.phone === 'string' && params.phone) prefill.phone = params.phone;
  if (typeof params.customerName === 'string' && params.customerName) {
    prefill.customerName = params.customerName;
  }
  if (typeof params.tyreProblemType === 'string' && params.tyreProblemType) {
    prefill.tyreProblemType = params.tyreProblemType;
  }
  if (typeof params.jobType === 'string' && params.jobType) prefill.jobType = params.jobType;
  if (fullLabel) prefill.locationLabel = fullLabel;
  if (typeof lat === 'number' && Number.isFinite(lat)) prefill.latitude = lat;
  if (typeof lng === 'number' && Number.isFinite(lng)) prefill.longitude = lng;
  if (typeof params.vehicleRegistration === 'string' && params.vehicleRegistration) {
    prefill.vehicleRegistration = params.vehicleRegistration;
  }

  return <QuickBookingWizard prefill={prefill} />;
}
