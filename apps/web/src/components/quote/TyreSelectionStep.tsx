'use client';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  Badge,
  chakra,
  Field,
  HStack,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { NoTyreSizeShortcut } from '@/components/mobile/NoTyreSizeShortcut';
import type { TyreOption, TyrePayload } from '@/types/quote';
import type { LockingWheelNutStatus } from '@/lib/bookings/types';

export type { TyrePayload };

export interface TyreSelectionStepProps {
  initial: TyrePayload | null;
  onContinue: (payload: TyrePayload) => void;
  onBack: () => void;
}

interface SizesResponse {
  sizes: string[];
}

interface InStockResponse {
  size: string;
  items: TyreOption[];
}

const SIZE_REGEX = /^\d{3}\/\d{2}R\d{2}$/;
const SIZE_HINT = 'Format: 205/55R16 — three digits, slash, two digits, R, two digits.';

type Phase = 'size' | 'options' | 'wheel-lock';

interface WheelLockOption {
  value: LockingWheelNutStatus;
  title: string;
  description: string | null;
  warning?: string;
}

function labelSeason(season: TyreOption['season']): string {
  switch (season) {
    case 'summer':
      return 'Summer';
    case 'winter':
      return 'Winter';
    case 'all_season':
      return 'All-season';
    case 'run_flat':
      return 'Run-flat';
    case 'commercial':
      return 'Commercial';
  }
}

const WHEEL_LOCK_OPTIONS: WheelLockOption[] = [
  {
    value: 'HAVE_KEY',
    title: 'I have locking wheel nuts and the key',
    description: 'Quickest fitting — our driver can use your key on arrival.',
  },
  {
    value: 'NO_KEY',
    title: 'I have locking wheel nuts but lost the key',
    description: 'No problem — we can still help.',
    warning: 'We may need extra equipment — additional time may apply.',
  },
  {
    value: 'STANDARD_ONLY',
    title: 'Standard nuts only (no locking nuts)',
    description: 'Standard tools only — straightforward fitting.',
  },
];

export function TyreSelectionStep({
  initial,
  onContinue,
  onBack,
}: TyreSelectionStepProps) {
  const sizeInputId = useId();
  const datalistId = `${sizeInputId}-list`;

  const [phase, setPhase] = useState<Phase>(() => {
    if (initial?.lockingWheelNutStatus) return 'wheel-lock';
    if (initial?.selected) return 'options';
    return 'size';
  });

  // -------- Phase 1: size --------
  const [size, setSize] = useState<string>(initial?.size ?? '');
  const [sizeTouched, setSizeTouched] = useState(false);
  const [knownSizes, setKnownSizes] = useState<string[] | null>(null);
  const [sizesError, setSizesError] = useState<string | null>(null);
  const [sizesLoading, setSizesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSizesLoading(true);
    setSizesError(null);
    fetch('/api/tyres/sizes', { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as Partial<SizesResponse> & {
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setSizesError(data.error ?? 'Could not load tyre sizes.');
          return;
        }
        setKnownSizes(Array.isArray(data.sizes) ? data.sizes : []);
      })
      .catch(() => {
        if (!cancelled) setSizesError('Network error while loading sizes.');
      })
      .finally(() => {
        if (!cancelled) setSizesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedSize = size.trim().toUpperCase();
  const sizeIsValid = SIZE_REGEX.test(normalizedSize);

  // -------- Phase 2: options --------
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [options, setOptions] = useState<TyreOption[]>([]);
  const [selected, setSelected] = useState<TyreOption | null>(initial?.selected ?? null);

  useEffect(() => {
    if (phase !== 'options' || !sizeIsValid) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptionsLoading(true);
    setOptionsError(null);
    fetch(`/api/tyres/in-stock?size=${encodeURIComponent(normalizedSize)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as Partial<InStockResponse> & {
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setOptionsError(data.error ?? 'Could not load tyres for that size.');
          setOptions([]);
          return;
        }
        setOptions(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) {
          setOptionsError('Network error while loading tyres.');
          setOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [phase, normalizedSize, sizeIsValid]);

  // -------- Phase 3: wheel-lock --------
  const [wheelLock, setWheelLock] = useState<LockingWheelNutStatus | null>(
    initial?.lockingWheelNutStatus ?? null,
  );

  const sizeSuggestions = useMemo(() => knownSizes ?? [], [knownSizes]);

  function handleSizeContinue(): void {
    setSizeTouched(true);
    if (!sizeIsValid) return;
    setPhase('options');
  }

  function handleOptionSelect(option: TyreOption): void {
    setSelected(option);
    setPhase('wheel-lock');
  }

  function handleWheelLockContinue(): void {
    if (!selected || !wheelLock) return;
    onContinue({
      size: normalizedSize,
      selected,
      lockingWheelNutStatus: wheelLock,
    });
  }

  function handleBack(): void {
    if (phase === 'wheel-lock') {
      setPhase('options');
      return;
    }
    if (phase === 'options') {
      setPhase('size');
      return;
    }
    onBack();
  }

  return (
    <Stack gap="5">
      {/* Phase 1 — Size */}
      {phase === 'size' && (
        <Stack
          gap="4"
          p={{ base: '4', md: '5' }}
          borderRadius="lg"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.surface"
          transition="opacity 0.2s ease"
        >
          <Stack gap="1">
            <Text fontFamily="heading" color="accent.neon" fontSize="lg">
              What tyre size do you need?
            </Text>
            <Text color="fg.muted" fontSize="sm">
              You&apos;ll find this on the side of your tyre, e.g. 205/55R16.
            </Text>
          </Stack>

          <NoTyreSizeShortcut />

          {sizesLoading ? (
            <HStack gap="2" color="fg.muted">
              <Spinner size="sm" />
              <Text fontSize="sm">Loading available sizes…</Text>
            </HStack>
          ) : null}

          <Field.Root invalid={sizeTouched && !sizeIsValid}>
            <Field.Label color="fg.default" htmlFor={sizeInputId}>
              Tyre size
            </Field.Label>
            <Input
              id={sizeInputId}
              list={datalistId}
              value={size}
              onChange={(e) => {
                setSize(e.target.value.toUpperCase());
                setSizeTouched(true);
              }}
              placeholder="e.g. 205/55R16"
              autoComplete="off"
              inputMode="text"
              bg="bg.canvas"
              borderColor="border.subtle"
              color="fg.default"
            />
            <datalist id={datalistId}>
              {sizeSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <Field.HelperText color="fg.muted">{SIZE_HINT}</Field.HelperText>
            {sizeTouched && !sizeIsValid && (
              <Field.ErrorText>That doesn&apos;t look like a tyre size yet.</Field.ErrorText>
            )}
          </Field.Root>

          {sizesError && (
            <Text color="accent.neon" fontSize="xs" role="status">
              {sizesError}
            </Text>
          )}

          <HStack gap="3" wrap="wrap">
            <GoldButton variant="ghost" onClick={handleBack}>
              Back
            </GoldButton>
            <GoldButton
              variant="solid"
              onClick={handleSizeContinue}
              disabled={!sizeIsValid}
            >
              Continue
            </GoldButton>
          </HStack>
        </Stack>
      )}

      {/* Phase 2 — Options */}
      {phase === 'options' && (
        <Stack
          gap="4"
          p={{ base: '4', md: '5' }}
          borderRadius="lg"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.surface"
        >
          <Stack gap="1">
            <Text fontFamily="heading" color="accent.neon" fontSize="lg">
              In stock for {normalizedSize}
            </Text>
            <Text color="fg.muted" fontSize="sm">
              We only show tyres we can fit today. Prices include fitting.
            </Text>
          </Stack>

          {optionsLoading && (
            <HStack gap="2" color="fg.muted">
              <Spinner size="sm" />
              <Text fontSize="sm">Checking stock…</Text>
            </HStack>
          )}

          {!optionsLoading && optionsError && (
            <Stack
              gap="2"
              p="3"
              borderRadius="md"
              borderWidth="1px"
              borderColor="border.subtle"
              role="alert"
            >
              <Text color="accent.neon" fontSize="sm">
                {optionsError}
              </Text>
              <HStack>
                <GoldButton variant="outline" size="sm" onClick={() => setPhase('size')}>
                  Pick a different size
                </GoldButton>
              </HStack>
            </Stack>
          )}

          {!optionsLoading && !optionsError && options.length === 0 && (
            <Stack
              gap="2"
              p="3"
              borderRadius="md"
              borderWidth="1px"
              borderColor="border.subtle"
            >
              <Text color="fg.default" fontSize="sm">
                No tyres in stock for this size — pick another.
              </Text>
              <HStack>
                <GoldButton variant="outline" size="sm" onClick={() => setPhase('size')}>
                  Back to size
                </GoldButton>
              </HStack>
            </Stack>
          )}

          {!optionsLoading && options.length > 0 && (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
              {options.map((opt) => (
                <Stack
                  key={opt.id}
                  gap="2"
                  p="4"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={selected?.id === opt.id ? 'border.gold' : 'border.subtle'}
                  bg="bg.canvas"
                  transition="border-color 0.2s ease"
                >
                  <Stack gap="0">
                    <Text color="fg.default" fontFamily="heading" fontSize="md">
                      {opt.brand} {opt.model}
                    </Text>
                    <Text color="fg.muted" fontSize="xs">
                      {labelSeason(opt.season)}
                    </Text>
                  </Stack>
                  <HStack gap="2" wrap="wrap">
                    {opt.fuelRating && <EuLabel kind="Fuel" value={opt.fuelRating} />}
                    {opt.wetGrip && <EuLabel kind="Wet" value={opt.wetGrip} />}
                    {opt.noiseDb !== null && (
                      <EuLabel kind="Noise" value={`${opt.noiseDb} dB`} />
                    )}
                  </HStack>
                  <HStack justify="space-between" align="center">
                    <Text color="accent.neon" fontFamily="heading" fontSize="lg">
                      £{opt.price.toFixed(2)}
                    </Text>
                    <GoldButton size="sm" variant="solid" onClick={() => handleOptionSelect(opt)}>
                      Select
                    </GoldButton>
                  </HStack>
                </Stack>
              ))}
            </SimpleGrid>
          )}

          <HStack gap="3" wrap="wrap">
            <GoldButton variant="ghost" onClick={handleBack}>
              Back
            </GoldButton>
          </HStack>
        </Stack>
      )}

      {/* Phase 3 — Wheel lock */}
      {phase === 'wheel-lock' && (
        <Stack
          gap="4"
          p={{ base: '4', md: '5' }}
          borderRadius="lg"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.surface"
        >
          <Stack gap="1">
            <Text fontFamily="heading" color="accent.neon" fontSize="lg">
              About your wheel nuts
            </Text>
            <Text color="fg.muted" fontSize="sm">
              This helps our driver bring the right tools.
            </Text>
          </Stack>

          <Stack gap="3">
            {WHEEL_LOCK_OPTIONS.map((opt) => {
              const active = wheelLock === opt.value;
              return (
                <Stack key={opt.value} gap="1">
                  <ChakraButton
                    type="button"
                    onClick={() => setWheelLock(opt.value)}
                    p="4"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={active ? 'border.gold' : 'border.subtle'}
                    bg={active ? 'bg.surface' : 'bg.canvas'}
                    textAlign="left"
                    transition="border-color 0.2s ease, background 0.2s ease"
                    aria-pressed={active}
                    cursor="pointer"
                    width="100%"
                    display="block"
                  >
                    <Text color="fg.default" fontFamily="heading" fontSize="md">
                      {opt.title}
                    </Text>
                    {opt.description && (
                      <Text color="fg.muted" fontSize="sm" mt="1">
                        {opt.description}
                      </Text>
                    )}
                  </ChakraButton>
                  {active && opt.warning && (
                    <Text color="accent.neon" fontSize="xs" pl="1" role="status">
                      ⚠ {opt.warning}
                    </Text>
                  )}
                </Stack>
              );
            })}
          </Stack>

          <HStack gap="3" wrap="wrap">
            <GoldButton variant="ghost" onClick={handleBack}>
              Back
            </GoldButton>
            <GoldButton
              variant="solid"
              onClick={handleWheelLockContinue}
              disabled={!wheelLock || !selected}
            >
              Continue
            </GoldButton>
          </HStack>
        </Stack>
      )}
    </Stack>
  );
}

const ChakraButton = chakra('button');

function EuLabel({ kind, value }: { kind: string; value: string }) {
  return (
    <Badge
      bg="bg.canvas"
      color="fg.muted"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="sm"
      px="2"
      py="0.5"
      fontSize="xs"
      fontWeight="500"
    >
      {kind}: {value}
    </Badge>
  );
}
