'use client';
/**
 * Tyre Shop wizard.
 *
 * Steps:
 *   1. Browse + filter + pick a tyre + quantity.
 *   2. Choose fitting method (GARAGE or HOME). For HOME, capture address
 *      via the existing CurrentLocationCard (Mapbox-backed lat/lng — never
 *      Google Maps, per project rules).
 *   3. Pick a fitting slot (next 14 days, Sundays excluded; backorder
 *      slots auto-shift by the working-day ETA).
 *   4. Locking wheel-nut question. NO_KEY hard-blocks checkout to mirror
 *      the existing /api/checkout/session behaviour.
 *   5. Customer details + create order. We POST /api/tyre-shop/orders
 *      which reserves a booking row, hard-checks NO_KEY, creates the
 *      Stripe PaymentIntent and returns the clientSecret. We then send
 *      the customer to /tyres/checkout/[bookingId]?cs=... to render the
 *      embedded Stripe Payment Element.
 */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Box,
  Button,
  chakra,
  Field,
  Grid,
  HStack,
  Heading,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { CurrentLocationCard } from '@/components/quote/CurrentLocationCard';
import type {
  FittingMethod,
  TyreShopItem,
  TyreShopAddress,
  TyreShopQuoteResponse,
  TyreShopSelectedSlot,
  WheelNutAnswer,
} from '@/types/tyre-shop';
import type { CapturedLocation } from '@/types/quote';

interface SlotOption {
  date: string;
  time: string;
  label: string;
}

export interface TyreShopClientProps {
  initialItems: TyreShopItem[];
  sizes: string[];
  brands: string[];
  backorderEtaWorkingDays: number;
  maxHomeFittingMiles: number;
  fittingFeeGarageGbp: number;
  fittingFeeHomeGbp: number;
}

type Step = 'browse' | 'fitting' | 'wheelnut' | 'contact' | 'submitting';

const SEASON_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Any type' },
  { value: 'summer', label: 'Summer' },
  { value: 'winter', label: 'Winter' },
  { value: 'all_season', label: 'All season' },
  { value: 'run_flat', label: 'Run-flat' },
  { value: 'commercial', label: 'Commercial' },
];

const TIER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Any tier' },
  { value: 'budget', label: 'Budget' },
  { value: 'mid_range', label: 'Mid-range' },
  { value: 'premium', label: 'Premium' },
];

function formatGbp(n: number): string {
  return `£${n.toFixed(2)}`;
}

// Polymorphic button styled via Chakra factory so we can pass `type` and
// HTML button props while keeping Chakra style props.
const StyledButton = chakra('button');

function tierLabel(t: string): string {
  if (t === 'mid_range') return 'Mid-range';
  if (t === 'budget') return 'Budget';
  if (t === 'premium') return 'Premium';
  return t;
}

/**
 * Pick a professional tyre illustration based on season. Premium SVGs live
 * under /public/images/tyres and are generic — no third-party brand artwork.
 */
function tyreImageSrc(season: string | null): string {
  switch (season) {
    case 'winter':
      return '/images/tyres/winter.svg';
    case 'all_season':
      return '/images/tyres/all-season.svg';
    case 'run_flat':
      return '/images/tyres/run-flat.svg';
    case 'summer':
    case 'commercial':
    default:
      return '/images/tyres/premium.svg';
  }
}

export function TyreShopClient(props: TyreShopClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<TyreShopItem[]>(props.initialItems);
  const [filterSize, setFilterSize] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);

  const [step, setStep] = useState<Step>('browse');
  const [selectedTyre, setSelectedTyre] = useState<TyreShopItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [fittingMethod, setFittingMethod] = useState<FittingMethod>('GARAGE');
  const [capturedLocation, setCapturedLocation] = useState<CapturedLocation | null>(null);
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TyreShopSelectedSlot | null>(null);
  const [wheelNutAnswer, setWheelNutAnswer] = useState<WheelNutAnswer | null>(null);
  const [acceptsBackorder, setAcceptsBackorder] = useState(false);
  const [quote, setQuote] = useState<TyreShopQuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ----- Filters -----
  const refetchItems = useMemo(
    () => async () => {
      setFilterLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterSize) params.set('sizeLabel', filterSize);
        if (filterBrand) params.set('brand', filterBrand);
        if (filterSeason) params.set('season', filterSeason);
        if (filterTier) params.set('tier', filterTier);
        if (inStockOnly) params.set('inStockOnly', 'true');
        const res = await fetch(`/api/tyre-shop/list?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as { items: TyreShopItem[] };
          setItems(data.items ?? []);
        }
      } catch {
        // non-fatal
      } finally {
        setFilterLoading(false);
      }
    },
    [filterSize, filterBrand, filterSeason, filterTier, inStockOnly],
  );

  useEffect(() => {
    void refetchItems();
  }, [refetchItems]);

  // ----- Slots -----
  useEffect(() => {
    if (step !== 'fitting' || !selectedTyre) return;
    const isBackorder = selectedTyre.effectiveStock < quantity;
    void (async () => {
      try {
        const res = await fetch(
          `/api/tyre-shop/slots?isBackorder=${isBackorder ? 'true' : 'false'}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { slots: SlotOption[] };
          setSlots(data.slots ?? []);
        }
      } catch {
        // non-fatal
      }
    })();
  }, [step, selectedTyre, quantity]);

  // ----- Live quote on fitting/address/slot/wheelnut/quantity changes -----
  useEffect(() => {
    if (!selectedTyre || step === 'browse') return;
    if (step === 'wheelnut' && !wheelNutAnswer) return;
    void (async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const address: TyreShopAddress | undefined =
          fittingMethod === 'HOME' && capturedLocation
            ? toAddress(capturedLocation)
            : undefined;
        const res = await fetch('/api/tyre-shop/quote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            tyreCatalogId: selectedTyre.id,
            quantity,
            fittingMethod,
            address,
            selectedSlot: selectedSlot ?? { date: '2099-01-01', time: '09:00' },
            wheelNutAnswer: wheelNutAnswer ?? 'HAS_KEY',
            acceptsBackorder,
          }),
        });
        const data = (await res.json()) as TyreShopQuoteResponse & { error?: string };
        if (!res.ok) {
          setQuoteError(data.error ?? 'Could not calculate quote');
          setQuote(null);
          return;
        }
        setQuote(data);
      } catch {
        setQuoteError('Could not calculate quote');
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    })();
  }, [
    selectedTyre,
    step,
    quantity,
    fittingMethod,
    capturedLocation,
    selectedSlot,
    wheelNutAnswer,
    acceptsBackorder,
  ]);

  // ----- Handlers -----
  function pickTyre(t: TyreShopItem) {
    setSelectedTyre(t);
    setQuantity(1);
    setFittingMethod('GARAGE');
    setCapturedLocation(null);
    setSelectedSlot(null);
    setWheelNutAnswer(null);
    setAcceptsBackorder(false);
    setQuote(null);
    setStep('fitting');
  }

  async function submitOrder() {
    if (!selectedTyre || !selectedSlot || !wheelNutAnswer) return;
    if (wheelNutAnswer === 'NO_KEY') {
      setSubmitError(
        'You cannot pay online without the locking wheel nut key. Please call us instead.',
      );
      return;
    }
    setStep('submitting');
    setSubmitError(null);
    const address: TyreShopAddress | undefined =
      fittingMethod === 'HOME' && capturedLocation ? toAddress(capturedLocation) : undefined;
    try {
      const res = await fetch('/api/tyre-shop/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          tyreCatalogId: selectedTyre.id,
          quantity,
          fittingMethod,
          address,
          selectedSlot,
          wheelNutAnswer,
          acceptsBackorder,
          notes: notes || undefined,
        }),
      });
      const data = (await res.json()) as {
        bookingId?: string;
        clientSecret?: string;
        trackingId?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.bookingId || !data.clientSecret) {
        setSubmitError(data.error ?? 'Could not start checkout');
        setStep('contact');
        return;
      }
      router.push(
        `/tyres/checkout/${data.bookingId}?cs=${encodeURIComponent(data.clientSecret)}&tid=${encodeURIComponent(data.trackingId ?? '')}`,
      );
    } catch {
      setSubmitError('Network error. Please try again.');
      setStep('contact');
    }
  }

  // ----- Render -----
  return (
    <Stack gap="6">
      <ProgressStrip step={step} />

      {step === 'browse' ? (
        <Stack gap="6">
          <FilterBar
            sizes={props.sizes}
            brands={props.brands}
            filterSize={filterSize}
            filterBrand={filterBrand}
            filterSeason={filterSeason}
            filterTier={filterTier}
            inStockOnly={inStockOnly}
            loading={filterLoading}
            onChange={(patch) => {
              if (patch.size !== undefined) setFilterSize(patch.size);
              if (patch.brand !== undefined) setFilterBrand(patch.brand);
              if (patch.season !== undefined) setFilterSeason(patch.season);
              if (patch.tier !== undefined) setFilterTier(patch.tier);
              if (patch.inStockOnly !== undefined) setInStockOnly(patch.inStockOnly);
            }}
          />
          <ItemGrid items={items} onPick={pickTyre} />
        </Stack>
      ) : null}

      {step !== 'browse' && selectedTyre ? (
        <Stack gap="6">
          <SelectedTyreSummary
            tyre={selectedTyre}
            quantity={quantity}
            quote={quote}
            quoteLoading={quoteLoading}
            quoteError={quoteError}
            onChangeQuantity={setQuantity}
            onBack={() => setStep('browse')}
            backorderEtaWorkingDays={props.backorderEtaWorkingDays}
            acceptsBackorder={acceptsBackorder}
            onAcceptsBackorderChange={setAcceptsBackorder}
          />

          {step === 'fitting' ? (
            <FittingStep
              fittingMethod={fittingMethod}
              onChangeFittingMethod={setFittingMethod}
              capturedLocation={capturedLocation}
              onCapturedLocation={setCapturedLocation}
              slots={slots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              maxHomeFittingMiles={props.maxHomeFittingMiles}
              fittingFeeGarageGbp={props.fittingFeeGarageGbp}
              fittingFeeHomeGbp={props.fittingFeeHomeGbp}
              quote={quote}
              onContinue={() => setStep('wheelnut')}
              canContinue={
                Boolean(selectedSlot) &&
                (fittingMethod === 'GARAGE' || Boolean(capturedLocation)) &&
                Boolean(quote?.allowed)
              }
            />
          ) : null}

          {step === 'wheelnut' ? (
            <WheelNutStep
              answer={wheelNutAnswer}
              onAnswer={setWheelNutAnswer}
              onBack={() => setStep('fitting')}
              onContinue={() => setStep('contact')}
            />
          ) : null}

          {step === 'contact' || step === 'submitting' ? (
            <ContactStep
              customerName={customerName}
              customerPhone={customerPhone}
              customerEmail={customerEmail}
              notes={notes}
              onName={setCustomerName}
              onPhone={setCustomerPhone}
              onEmail={setCustomerEmail}
              onNotes={setNotes}
              submitting={step === 'submitting'}
              submitError={submitError}
              onBack={() => setStep('wheelnut')}
              onSubmit={submitOrder}
              quote={quote}
            />
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}

// ===== Helper components =====

function ProgressStrip({ step }: { step: Step }) {
  const items: ReadonlyArray<{ key: Step | 'submit'; label: string }> = [
    { key: 'browse', label: '1. Choose tyre' },
    { key: 'fitting', label: '2. Fitting & slot' },
    { key: 'wheelnut', label: '3. Locking nut' },
    { key: 'contact', label: '4. Contact & pay' },
  ];
  return (
    <HStack gap="3" wrap="wrap">
      {items.map((it) => {
        const active =
          it.key === step ||
          (it.key === 'contact' && step === 'submitting');
        return (
          <Badge
            key={it.key}
            variant={active ? 'solid' : 'subtle'}
            colorPalette={active ? 'yellow' : 'gray'}
          >
            {it.label}
          </Badge>
        );
      })}
    </HStack>
  );
}

interface FilterPatch {
  size?: string;
  brand?: string;
  season?: string;
  tier?: string;
  inStockOnly?: boolean;
}

function FilterBar(props: {
  sizes: string[];
  brands: string[];
  filterSize: string;
  filterBrand: string;
  filterSeason: string;
  filterTier: string;
  inStockOnly: boolean;
  loading: boolean;
  onChange: (patch: FilterPatch) => void;
}) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.subtle"
      p="4"
      borderRadius="md"
    >
      <Stack gap="3">
        <Text color="fg.muted" fontSize="sm">
          Filter the catalogue {props.loading ? '(loading…)' : ''}
        </Text>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap="3">
          <Field.Root>
            <Field.Label color="fg.default">Size</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                aria-label="Tyre size"
                title="Tyre size"
                value={props.filterSize}
                onChange={(e) => props.onChange({ size: e.target.value })}
              >
                <option value="">Any size</option>
                {props.sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root>
            <Field.Label color="fg.default">Brand</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                aria-label="Tyre brand"
                title="Tyre brand"
                value={props.filterBrand}
                onChange={(e) => props.onChange({ brand: e.target.value })}
              >
                <option value="">Any brand</option>
                {props.brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root>
            <Field.Label color="fg.default">Season</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                aria-label="Tyre season"
                title="Tyre season"
                value={props.filterSeason}
                onChange={(e) => props.onChange({ season: e.target.value })}
              >
                {SEASON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root>
            <Field.Label color="fg.default">Tier</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                aria-label="Tyre tier"
                title="Tyre tier"
                value={props.filterTier}
                onChange={(e) => props.onChange({ tier: e.target.value })}
              >
                {TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
        </Grid>
        <HStack>
          <input
            id="tyre-shop-instock"
            type="checkbox"
            aria-label="In stock only"
            checked={props.inStockOnly}
            onChange={(e) => props.onChange({ inStockOnly: e.target.checked })}
          />
          <chakra.label
            htmlFor="tyre-shop-instock"
            cursor="pointer"
            color="fg.muted"
            fontSize="sm"
          >
            In stock only
          </chakra.label>
        </HStack>
      </Stack>
    </Box>
  );
}

function ItemGrid({
  items,
  onPick,
}: {
  items: TyreShopItem[];
  onPick: (t: TyreShopItem) => void;
}) {
  if (items.length === 0) {
    return (
      <Box
        borderWidth="1px"
        borderStyle="dashed"
        borderColor="border.subtle"
        p="6"
        borderRadius="md"
      >
        <Text color="fg.muted">
          No tyres match these filters. Clear the filters or call us to source a tyre.
        </Text>
      </Box>
    );
  }
  return (
    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap="4">
      {items.map((t) => {
        const stockColor =
          t.stockStatus === 'IN_STOCK'
            ? 'green'
            : t.stockStatus === 'LOW_STOCK'
              ? 'orange'
              : 'red';
        return (
          <Box
            key={t.id}
            borderWidth="1px"
            borderColor="border.subtle"
            bg="bg.subtle"
            p="4"
            borderRadius="md"
            display="flex"
            flexDirection="column"
            gap="3"
            transition="border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease"
            css={{
              '&:hover .tyre-shop-card__image': {
                animation: 'tyreShopSpin 1.6s linear infinite',
              },
              '@media (prefers-reduced-motion: reduce)': {
                '&:hover .tyre-shop-card__image': { animation: 'none' },
              },
              '@keyframes tyreShopSpin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
              },
            }}
            _hover={{
              borderColor: 'border.gold',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}
          >
            <Box
              as="figure"
              m="0"
              borderRadius="md"
              overflow="hidden"
              bg="white"
              borderWidth="1px"
              borderColor="border.subtle"
              aspectRatio={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {/* Generic premium tyre artwork — no third-party brand imagery. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <chakra.img
                className="tyre-shop-card__image"
                src={tyreImageSrc(t.season)}
                alt={`${t.brand} ${t.model} ${t.sizeLabel} tyre`}
                loading="lazy"
                width="100%"
                height="100%"
                objectFit="contain"
                p="3"
                filter="drop-shadow(0 8px 14px rgba(0,0,0,0.25))"
                transformOrigin="center"
                style={{ willChange: 'transform' }}
              />
            </Box>
            <Stack gap="1">
              <Text fontWeight="bold" color="fg.default">
                {t.brand} {t.model}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {t.sizeLabel} • {tierLabel(t.tier)}
                {t.season ? ` • ${t.season.replace('_', ' ')}` : ''}
              </Text>
            </Stack>
            <HStack justify="space-between">
              <Text color="accent.neon" fontFamily="heading" fontSize="lg">
                {formatGbp(t.basePriceGbp)}
              </Text>
              <Badge colorPalette={stockColor} variant="subtle">
                {t.stockStatus === 'IN_STOCK'
                  ? 'In stock'
                  : t.stockStatus === 'LOW_STOCK'
                    ? `Only ${t.effectiveStock} left`
                    : 'Special order'}
              </Badge>
            </HStack>
            <GoldButton onClick={() => onPick(t)}>Choose this tyre</GoldButton>
          </Box>
        );
      })}
    </Grid>
  );
}

function SelectedTyreSummary(props: {
  tyre: TyreShopItem;
  quantity: number;
  quote: TyreShopQuoteResponse | null;
  quoteLoading: boolean;
  quoteError: string | null;
  onChangeQuantity: (q: number) => void;
  onBack: () => void;
  backorderEtaWorkingDays: number;
  acceptsBackorder: boolean;
  onAcceptsBackorderChange: (v: boolean) => void;
}) {
  const isBackorder = props.tyre.effectiveStock < props.quantity;
  // We only physically stock Budget all-season tyres. Any other tier/season
  // is sourced on order, so customers should see a clear "special order" note
  // rather than a generic "out of quantity" backorder message.
  const isSpecialOrderType =
    props.tyre.effectiveStock === 0 &&
    !(props.tyre.tier === 'budget' && props.tyre.season === 'all_season');
  return (
    <Box borderWidth="1px" borderColor="border.gold" bg="bg.subtle" p="4" borderRadius="md">
      <Stack gap="3">
        <HStack justify="space-between" wrap="wrap">
          <Stack gap="1">
            <Text fontWeight="bold" color="fg.default">
              {props.tyre.brand} {props.tyre.model}
            </Text>
            <Text color="fg.muted" fontSize="sm">
              {props.tyre.sizeLabel} • {formatGbp(props.tyre.basePriceGbp)} per tyre
            </Text>
          </Stack>
          <Button variant="ghost" onClick={props.onBack} size="sm" color="fg.muted">
            Change tyre
          </Button>
        </HStack>

        <HStack>
          <Field.Root maxW="32">
            <Field.Label color="fg.default">Quantity</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                aria-label="Quantity"
                title="Quantity"
                value={String(props.quantity)}
                onChange={(e) => props.onChangeQuantity(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
        </HStack>

        {isBackorder ? (
          <Box
            borderWidth="1px"
            borderColor="orange.400"
            bg="orange.900"
            p="3"
            borderRadius="md"
          >
            <Stack gap="2">
              <Text color="fg.default" fontWeight="bold">
                {isSpecialOrderType
                  ? `Special order — fitted within ${props.backorderEtaWorkingDays} working days`
                  : `Backorder — fitted within ${props.backorderEtaWorkingDays} working days`}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {isSpecialOrderType
                  ? `We only keep Budget all-season tyres in stock for same-day fitting. ${props.tyre.brand} ${props.tyre.model} (${tierLabel(props.tyre.tier)}${props.tyre.season ? ` • ${props.tyre.season.replace('_', ' ')}` : ''}) is sourced on order — pay now and we'll fit it within ${props.backorderEtaWorkingDays} working days.`
                  : `We don't hold this quantity in stock. Pay now and we'll source it for fitting within ${props.backorderEtaWorkingDays} working days.`}
              </Text>
              <HStack>
                <input
                  id="tyre-shop-backorder"
                  type="checkbox"
                  aria-label="I accept the backorder ETA"
                  checked={props.acceptsBackorder}
                  onChange={(e) => props.onAcceptsBackorderChange(e.target.checked)}
                />
                <chakra.label
                  htmlFor="tyre-shop-backorder"
                  cursor="pointer"
                  color="fg.muted"
                  fontSize="sm"
                >
                  I accept the {props.backorderEtaWorkingDays} working day {isSpecialOrderType ? 'special order' : 'backorder'}.
                </chakra.label>
              </HStack>
            </Stack>
          </Box>
        ) : null}

        <QuoteSummary
          quote={props.quote}
          loading={props.quoteLoading}
          error={props.quoteError}
        />
      </Stack>
    </Box>
  );
}

function QuoteSummary({
  quote,
  loading,
  error,
}: {
  quote: TyreShopQuoteResponse | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <Text color="fg.muted" fontSize="sm">
        Calculating live quote…
      </Text>
    );
  }
  if (error) {
    return (
      <Text color="red.300" fontSize="sm">
        {error}
      </Text>
    );
  }
  if (!quote || !quote.priceBreakdown) return null;
  return (
    <Stack gap="1">
      <HStack justify="space-between">
        <Text color="fg.muted" fontSize="sm">
          Tyres
        </Text>
        <Text color="fg.default" fontSize="sm">
          {formatGbp(quote.priceBreakdown.tyreTotalGbp)}
        </Text>
      </HStack>
      <HStack justify="space-between">
        <Text color="fg.muted" fontSize="sm">
          Fitting fee
        </Text>
        <Text color="fg.default" fontSize="sm">
          {formatGbp(quote.priceBreakdown.fittingFeeGbp)}
        </Text>
      </HStack>
      {quote.priceBreakdown.distanceFeeGbp > 0 ? (
        <HStack justify="space-between">
          <Text color="fg.muted" fontSize="sm">
            Distance fee
            {typeof quote.distanceMiles === 'number'
              ? ` (${quote.distanceMiles.toFixed(1)} mi)`
              : ''}
          </Text>
          <Text color="fg.default" fontSize="sm">
            {formatGbp(quote.priceBreakdown.distanceFeeGbp)}
          </Text>
        </HStack>
      ) : null}
      <HStack justify="space-between" pt="2" borderTopWidth="1px" borderColor="border.subtle">
        <Text color="fg.default" fontWeight="bold">
          Total
        </Text>
        <Text color="accent.neon" fontFamily="heading" fontSize="lg">
          {formatGbp(quote.priceBreakdown.totalGbp)}
        </Text>
      </HStack>
      {!quote.allowed && quote.message ? (
        <Text color="red.300" fontSize="sm">
          {quote.message}
        </Text>
      ) : null}
    </Stack>
  );
}

function FittingStep(props: {
  fittingMethod: FittingMethod;
  onChangeFittingMethod: (m: FittingMethod) => void;
  capturedLocation: CapturedLocation | null;
  onCapturedLocation: (l: CapturedLocation) => void;
  slots: SlotOption[];
  selectedSlot: TyreShopSelectedSlot | null;
  onSelectSlot: (s: TyreShopSelectedSlot) => void;
  maxHomeFittingMiles: number;
  fittingFeeGarageGbp: number;
  fittingFeeHomeGbp: number;
  quote: TyreShopQuoteResponse | null;
  onContinue: () => void;
  canContinue: boolean;
}) {
  return (
    <Box borderWidth="1px" borderColor="border.subtle" bg="bg.subtle" p="4" borderRadius="md">
      <Stack gap="4">
        <Heading as="h2" size="md" color="fg.default" fontFamily="heading">
          Fitting & slot
        </Heading>

        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap="3">
          <StyledButton type="button"
            onClick={() => props.onChangeFittingMethod('GARAGE')}
            borderWidth="2px"
            borderColor={props.fittingMethod === 'GARAGE' ? 'border.gold' : 'border.subtle'}
            bg="bg.canvas"
            p="4"
            borderRadius="md"
            textAlign="left"
          >
            <Stack gap="1">
              <Text fontWeight="bold" color="fg.default">
                Garage fitting — {formatGbp(props.fittingFeeGarageGbp)}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                Drop your vehicle at our workshop. Fastest option.
              </Text>
            </Stack>
          </StyledButton>
          <StyledButton type="button"
            onClick={() => props.onChangeFittingMethod('HOME')}
            borderWidth="2px"
            borderColor={props.fittingMethod === 'HOME' ? 'border.gold' : 'border.subtle'}
            bg="bg.canvas"
            p="4"
            borderRadius="md"
            textAlign="left"
          >
            <Stack gap="1">
              <Text fontWeight="bold" color="fg.default">
                Home fitting — from {formatGbp(props.fittingFeeHomeGbp)}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                We come to you. Distance fee may apply (within{' '}
                {props.maxHomeFittingMiles} miles).
              </Text>
            </Stack>
          </StyledButton>
        </Grid>

        {props.fittingMethod === 'HOME' ? (
          <Stack gap="2">
            <Text color="fg.default" fontWeight="bold">
              Where should we fit them?
            </Text>
            <Text color="fg.muted" fontSize="sm">
              Use your current location to capture an exact spot. Distance fees are
              calculated from our workshop.
            </Text>
            {props.capturedLocation ? (
              <Box
                borderWidth="1px"
                borderColor="border.subtle"
                bg="bg.canvas"
                p="3"
                borderRadius="md"
              >
                <Text color="fg.default" fontSize="sm">
                  {props.capturedLocation.addressLine1 ??
                    props.capturedLocation.postcode ??
                    'Location captured'}
                </Text>
                {props.capturedLocation.city ? (
                  <Text color="fg.muted" fontSize="xs">
                    {props.capturedLocation.city}
                    {props.capturedLocation.postcode
                      ? ` ${props.capturedLocation.postcode}`
                      : ''}
                  </Text>
                ) : null}
              </Box>
            ) : (
              <CurrentLocationCard onConfirm={props.onCapturedLocation} />
            )}
          </Stack>
        ) : null}

        <Stack gap="2">
          <Text color="fg.default" fontWeight="bold">
            Pick a fitting slot
          </Text>
          <Grid
            templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
            gap="2"
            maxH="64"
            overflowY="auto"
          >
            {props.slots.map((s) => {
              const isSelected =
                props.selectedSlot?.date === s.date && props.selectedSlot?.time === s.time;
              return (
                <StyledButton
                  key={`${s.date}-${s.time}`}
                  type="button"
                  onClick={() => props.onSelectSlot({ date: s.date, time: s.time })}
                  borderWidth="1px"
                  borderColor={isSelected ? 'border.gold' : 'border.subtle'}
                  bg={isSelected ? 'bg.canvas' : 'bg.subtle'}
                  p="2"
                  borderRadius="md"
                  fontSize="sm"
                  color="fg.default"
                  textAlign="left"
                >
                  {s.label}
                </StyledButton>
              );
            })}
          </Grid>
        </Stack>

        <HStack justify="flex-end">
          <GoldButton onClick={props.onContinue} disabled={!props.canContinue}>
            Continue
          </GoldButton>
        </HStack>
      </Stack>
    </Box>
  );
}

function WheelNutStep(props: {
  answer: WheelNutAnswer | null;
  onAnswer: (a: WheelNutAnswer) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <Box borderWidth="1px" borderColor="border.subtle" bg="bg.subtle" p="4" borderRadius="md">
      <Stack gap="3">
        <Heading as="h2" size="md" color="fg.default" fontFamily="heading">
          Locking wheel nut
        </Heading>
        <Text color="fg.muted">
          Do you have the locking wheel nut key in the vehicle? We need it to remove your
          existing wheels.
        </Text>
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap="3">
          <StyledButton type="button"
            onClick={() => props.onAnswer('HAS_KEY')}
            borderWidth="2px"
            borderColor={props.answer === 'HAS_KEY' ? 'border.gold' : 'border.subtle'}
            bg="bg.canvas"
            p="4"
            borderRadius="md"
            textAlign="left"
          >
            <Text fontWeight="bold" color="fg.default">
              Yes — I have the key
            </Text>
            <Text color="fg.muted" fontSize="sm">
              We can fit your tyres as scheduled.
            </Text>
          </StyledButton>
          <StyledButton type="button"
            onClick={() => props.onAnswer('NO_KEY')}
            borderWidth="2px"
            borderColor={props.answer === 'NO_KEY' ? 'red.400' : 'border.subtle'}
            bg="bg.canvas"
            p="4"
            borderRadius="md"
            textAlign="left"
          >
            <Text fontWeight="bold" color="fg.default">
              No — I don&apos;t have it
            </Text>
            <Text color="fg.muted" fontSize="sm">
              You must call us before booking. We can&apos;t take payment online without
              the key.
            </Text>
          </StyledButton>
        </Grid>
        {props.answer === 'NO_KEY' ? (
          <Box borderWidth="1px" borderColor="red.400" bg="red.950" p="3" borderRadius="md">
            <Text color="red.200">
              We can&apos;t take payment online without the locking wheel nut key. Please
              call us so we can plan a removal kit.
            </Text>
          </Box>
        ) : null}
        <HStack justify="space-between">
          <Button variant="ghost" onClick={props.onBack} color="fg.muted">
            Back
          </Button>
          <GoldButton
            onClick={props.onContinue}
            disabled={props.answer !== 'HAS_KEY'}
          >
            Continue
          </GoldButton>
        </HStack>
      </Stack>
    </Box>
  );
}

function ContactStep(props: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
  onName: (v: string) => void;
  onPhone: (v: string) => void;
  onEmail: (v: string) => void;
  onNotes: (v: string) => void;
  submitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onSubmit: () => void;
  quote: TyreShopQuoteResponse | null;
}) {
  const canSubmit =
    props.customerName.trim().length >= 2 &&
    /^\+?[0-9 ()\-]{7,32}$/.test(props.customerPhone.trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.customerEmail.trim()) &&
    Boolean(props.quote?.allowed);
  return (
    <Box borderWidth="1px" borderColor="border.subtle" bg="bg.subtle" p="4" borderRadius="md">
      <Stack gap="3">
        <Heading as="h2" size="md" color="fg.default" fontFamily="heading">
          Your contact details
        </Heading>
        <Stack gap="3">
          <Field.Root>
            <Field.Label color="fg.default">Full name</Field.Label>
            <Input
              value={props.customerName}
              onChange={(e) => props.onName(e.target.value)}
              autoComplete="name"
              bg="bg.canvas"
              color="fg.default"
              borderColor="border.subtle"
            />
          </Field.Root>
          <Field.Root>
            <Field.Label color="fg.default">Phone</Field.Label>
            <Input
              value={props.customerPhone}
              onChange={(e) => props.onPhone(e.target.value)}
              autoComplete="tel"
              type="tel"
              bg="bg.canvas"
              color="fg.default"
              borderColor="border.subtle"
            />
          </Field.Root>
          <Field.Root>
            <Field.Label color="fg.default">Email</Field.Label>
            <Input
              value={props.customerEmail}
              onChange={(e) => props.onEmail(e.target.value)}
              autoComplete="email"
              type="email"
              bg="bg.canvas"
              color="fg.default"
              borderColor="border.subtle"
            />
          </Field.Root>
          <Field.Root>
            <Field.Label color="fg.default">Anything we should know? (optional)</Field.Label>
            <Textarea
              value={props.notes}
              onChange={(e) => props.onNotes(e.target.value)}
              bg="bg.canvas"
              color="fg.default"
              borderColor="border.subtle"
            />
          </Field.Root>
        </Stack>
        {props.submitError ? (
          <Text color="red.300" fontSize="sm">
            {props.submitError}
          </Text>
        ) : null}
        <HStack justify="space-between">
          <Button
            variant="ghost"
            onClick={props.onBack}
            color="fg.muted"
            disabled={props.submitting}
          >
            Back
          </Button>
          <GoldButton
            onClick={props.onSubmit}
            disabled={!canSubmit || props.submitting}
          >
            {props.submitting ? 'Processing…' : 'Continue to secure payment'}
          </GoldButton>
        </HStack>
      </Stack>
    </Box>
  );
}

function toAddress(loc: CapturedLocation): TyreShopAddress {
  const out: TyreShopAddress = {};
  if (loc.addressLine1) out.line1 = loc.addressLine1;
  if (loc.addressLine2) out.line2 = loc.addressLine2;
  if (loc.city) out.city = loc.city;
  if (loc.postcode) out.postcode = loc.postcode;
  if (typeof loc.latitude === 'number') out.latitude = loc.latitude;
  if (typeof loc.longitude === 'number') out.longitude = loc.longitude;
  return out;
}

