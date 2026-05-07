'use client';
import { useEffect, useState } from 'react';
import { Box, Field, HStack, Input, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';

export interface EmergencyAssistCardProps {
  active: boolean;
  emergencyAssistEventId?: string | null;
  onActivate: () => void;
  onContinueToLocation: () => void;
  onDeactivate: () => void;
  onEventIdAcquired?: (eventId: string) => void;
}

const EMERGENCY_PHONE_TEL = '01412660690';
const EMERGENCY_PHONE_DISPLAY = '0141 266 0690';
const EMERGENCY_WHATSAPP_URL = 'https://wa.me/447423262955';

interface EmergencyAssistPostBody {
  source: 'QUOTE_EMERGENCY_BUTTON';
  customerPhone: string;
  customerName?: string;
}

interface EmergencyAssistPostResult {
  ok: boolean;
  eventId: string | null;
  error: string | null;
}

async function postEmergencyAssist(
  body: EmergencyAssistPostBody,
): Promise<EmergencyAssistPostResult> {
  try {
    const res = await fetch('/api/lead-events/emergency-assist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; eventId?: string; error?: string }
      | null;
    if (!res.ok || !data?.eventId) {
      return { ok: false, eventId: null, error: data?.error ?? 'Could not send request' };
    }
    return { ok: true, eventId: data.eventId, error: null };
  } catch {
    return { ok: false, eventId: null, error: 'Network error. Please call us instead.' };
  }
}

/**
 * Normalise raw user input into a phone candidate. Strips spaces, dashes and
 * parentheses; keeps a leading '+' if present.
 */
function normalisePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Lightweight UK-friendly phone validation. We let the server do the strict
 * check — this is just to avoid an obviously bad submission.
 */
function isLikelyPhone(value: string): boolean {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

function PulseDot() {
  return (
    <Box
      as="span"
      display="inline-block"
      w="10px"
      h="10px"
      borderRadius="full"
      bg="accent.neon"
      boxShadow="0 0 12px rgba(212,175,55,0.85)"
      animation="emergencyPulse 1.4s ease-in-out infinite"
      css={{
        '@keyframes emergencyPulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: 0.95 },
          '50%': { transform: 'scale(1.4)', opacity: 0.6 },
        },
      }}
      aria-hidden
    />
  );
}

/**
 * EmergencyAssistCard
 *
 * Flow (E2E):
 *  1. Idle (active=false) → big "I need help now" CTA.
 *  2. User clicks → onActivate() flips state.isEmergencyAssistMode in
 *     QuoteFlow, but NO admin event is created yet.
 *  3. We render an inline form: phone (REQUIRED) + name (optional). Until
 *     the user submits, the admin app stays silent.
 *  4. Submit → POST /api/lead-events/emergency-assist with the phone and
 *     name. On success we get back an eventId, surface a confirmed state
 *     and bubble the eventId up via onEventIdAcquired so the parent can
 *     PATCH the location later.
 *  5. Confirmed → show "Continue to location" + Call / WhatsApp / Deactivate.
 *
 * Why phone-first: the admin popup is useless without a callback number.
 * Capturing it before the realtime event fires guarantees the admin can
 * reach the customer the moment the popup appears.
 */
export function EmergencyAssistCard({
  active,
  emergencyAssistEventId = null,
  onActivate,
  onContinueToLocation,
  onDeactivate,
  onEventIdAcquired,
}: EmergencyAssistCardProps) {
  const [eventId, setEventId] = useState<string | null>(emergencyAssistEventId);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Adopt eventId restored from parent (e.g. autosave) so the form is
  // skipped on a returning session.
  useEffect(() => {
    if (emergencyAssistEventId && eventId !== emergencyAssistEventId) {
      setEventId(emergencyAssistEventId);
    }
  }, [emergencyAssistEventId, eventId]);

  // Reset transient form state whenever emergency mode is turned off.
  useEffect(() => {
    if (!active) {
      setSubmitError(null);
      setPhone('');
      setName('');
      setSubmitting(false);
    }
  }, [active]);

  const handleSubmit = async (): Promise<void> => {
    const candidate = normalisePhone(phone);
    if (!isLikelyPhone(candidate)) {
      setSubmitError('Please enter a valid mobile number so we can call you back.');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    const body: EmergencyAssistPostBody = {
      source: 'QUOTE_EMERGENCY_BUTTON',
      customerPhone: candidate,
    };
    if (name.trim()) body.customerName = name.trim();
    const result = await postEmergencyAssist(body);
    setSubmitting(false);
    if (!result.ok || !result.eventId) {
      setSubmitError(
        result.error ??
          `Could not send. Please call us on ${EMERGENCY_PHONE_DISPLAY} instead.`,
      );
      return;
    }
    setEventId(result.eventId);
    onEventIdAcquired?.(result.eventId);
  };

  // ---------- IDLE ----------
  if (!active) {
    return (
      <Stack
        gap="3"
        p={{ base: '4', md: '5' }}
        borderRadius="lg"
        borderWidth="2px"
        borderColor="border.gold"
        bg="bg.surface"
        boxShadow="0 0 18px rgba(212,175,55,0.18)"
      >
        <HStack gap="3" align="center">
          <PulseDot />
          <Text fontFamily="heading" color="accent.neon" fontSize={{ base: 'lg', md: 'xl' }}>
            Need help right now?
          </Text>
        </HStack>
        <Text color="fg.muted" fontSize="sm">
          One-tap emergency mode. Skip the tyre details — we&apos;ll come to your location, inspect
          the tyre and quote a repair or replacement on site. No tyre size needed.
        </Text>
        <HStack gap="3" wrap="wrap">
          <GoldButton onClick={onActivate} variant="solid" size="md">
            I need help now
          </GoldButton>
          <Text color="fg.muted" fontSize="xs">
            We&apos;ll ask for your number so we can call you back fast.
          </Text>
        </HStack>
      </Stack>
    );
  }

  // ---------- ACTIVE BUT PHONE NOT YET SENT ----------
  if (!eventId) {
    return (
      <Stack
        gap="3"
        p={{ base: '4', md: '5' }}
        borderRadius="lg"
        borderWidth="2px"
        borderColor="border.gold"
        bg="bg.surface"
        boxShadow="0 0 24px rgba(212,175,55,0.28)"
      >
        <HStack gap="3" align="center">
          <PulseDot />
          <Text fontFamily="heading" color="accent.neon" fontSize={{ base: 'lg', md: 'xl' }}>
            Emergency help — your number please
          </Text>
        </HStack>
        <Text color="fg.default" fontSize="sm">
          Leave us your mobile number so we can call you straight back. We&apos;ll triage the
          fastest fix for you on the phone.
        </Text>

        <Stack gap="3">
          <Field.Root required>
            <Field.Label color="fg.default">
              Mobile number <Text as="span" color="danger">*</Text>
            </Field.Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 07700 900123"
              bg="bg.canvas"
              borderColor="border.subtle"
              color="fg.default"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !submitting) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label color="fg.default">Your name (optional)</Field.Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="So we know who to ask for"
              bg="bg.canvas"
              borderColor="border.subtle"
              color="fg.default"
              autoComplete="name"
            />
          </Field.Root>
          {submitError && (
            <Text color="danger" fontSize="sm">
              {submitError}
            </Text>
          )}
          <HStack gap="3" wrap="wrap">
            <GoldButton
              onClick={() => void handleSubmit()}
              variant="solid"
              size="md"
              disabled={submitting || !phone.trim()}
            >
              {submitting ? 'Sending…' : 'Send emergency request'}
            </GoldButton>
            <GoldButton
              variant="outline"
              size="md"
              onClick={() => {
                window.location.href = `tel:${EMERGENCY_PHONE_TEL}`;
              }}
            >
              Or call now {EMERGENCY_PHONE_DISPLAY}
            </GoldButton>
            <GoldButton variant="ghost" size="sm" onClick={onDeactivate}>
              Cancel
            </GoldButton>
          </HStack>
          <Text color="fg.muted" fontSize="xs">
            We use your number only to call you about this emergency request.
          </Text>
        </Stack>
      </Stack>
    );
  }

  // ---------- CONFIRMED (phone sent, admin notified) ----------
  return (
    <Stack
      gap="3"
      p={{ base: '4', md: '5' }}
      borderRadius="lg"
      borderWidth="2px"
      borderColor="border.gold"
      bg="bg.surface"
      boxShadow="0 0 24px rgba(212,175,55,0.28)"
    >
      <HStack gap="3" align="center">
        <PulseDot />
        <Text fontFamily="heading" color="accent.neon" fontSize={{ base: 'lg', md: 'xl' }}>
          Got it — we&apos;ve been alerted
        </Text>
      </HStack>
      <Text color="fg.default" fontSize="sm">
        A team member will call you back as fast as possible. To get the most accurate quote and
        ETA, share your location next.
      </Text>
      <Text color="fg.muted" fontSize="xs">
        No tyre size needed now. We&apos;ll assess whether a repair or replacement is required.
      </Text>

      <HStack gap="3" wrap="wrap">
        <GoldButton onClick={onContinueToLocation} variant="solid" size="md">
          Continue to location
        </GoldButton>
        <GoldButton
          variant="outline"
          size="md"
          onClick={() => {
            window.location.href = `tel:${EMERGENCY_PHONE_TEL}`;
          }}
        >
          Call now {EMERGENCY_PHONE_DISPLAY}
        </GoldButton>
        <GoldButton
          variant="outline"
          size="md"
          onClick={() => {
            window.open(EMERGENCY_WHATSAPP_URL, '_blank', 'noopener,noreferrer');
          }}
        >
          WhatsApp
        </GoldButton>
        <GoldButton variant="ghost" size="md" onClick={onDeactivate}>
          Use normal tyre selection
        </GoldButton>
      </HStack>

      <Text color="fg.muted" fontSize="xs" opacity={0.6}>
        Reference: {eventId.slice(0, 8)}
      </Text>
    </Stack>
  );
}
