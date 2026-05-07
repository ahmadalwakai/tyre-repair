'use client';
import { useEffect, useMemo, useState } from 'react';
import { Box, chakra, Flex, Grid, HStack, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { COMMON_TYRE_SIZES } from '@/lib/quote/tyres';
import { TyreOptionCard } from './TyreOptionCard';
import { QuoteEmptyState } from './QuoteEmptyState';
import { QuoteErrorState } from './QuoteErrorState';
import { QuoteLoadingState } from './QuoteLoadingState';
import type {
  QuoteJobType,
  SelectedTyre,
  TyreProblemType,
  TyreSearchResultItem,
  TyreTier,
  TyreType,
  VehicleSelection,
} from '@/types/quote';

export interface TyreTriageResult {
  jobType: QuoteJobType;
  tyreProblemType: TyreProblemType;
  selectedTyre: SelectedTyre | null;
  backupTyre: SelectedTyre | null;
}

export interface TyreSelectionStepProps {
  vehicle: VehicleSelection | null;
  initial: TyreTriageResult | null;
  onContinue: (result: TyreTriageResult) => void;
  onBack: () => void;
}

interface SearchResponse {
  items: TyreSearchResultItem[];
  count: number;
}

interface ProblemOption {
  value: TyreProblemType;
  title: string;
  description: string;
  defaultJobType: QuoteJobType;
}

const PROBLEM_OPTIONS: ProblemOption[] = [
  {
    value: 'PUNCTURE_OR_FLAT',
    title: 'Puncture or flat tyre',
    description:
      "We'll come out, inspect the tyre and repair it on site if it's safe. If it needs replacing, we'll quote that before fitting.",
    defaultJobType: 'ASSESSMENT',
  },
  {
    value: 'NEEDS_REPLACEMENT',
    title: 'Replacement tyre',
    description:
      "Choose this if you already know the tyre needs replacing. We'll show suitable tyre options before checkout.",
    defaultJobType: 'REPLACEMENT',
  },
];

const TIER_OPTIONS: { value: TyreTier; label: string }[] = [
  { value: 'budget', label: 'Budget' },
  { value: 'mid_range', label: 'Mid-range' },
  { value: 'premium', label: 'Premium' },
];

const TYPE_OPTIONS: { value: TyreType; label: string }[] = [
  { value: 'summer', label: 'Summer' },
  { value: 'winter', label: 'Winter' },
  { value: 'all_season', label: 'All-season' },
  { value: 'run_flat', label: 'Run-flat' },
  { value: 'commercial', label: 'Commercial' },
];

export function TyreSelectionStep({
  vehicle,
  initial,
  onContinue,
  onBack,
}: TyreSelectionStepProps) {
  const [problem, setProblem] = useState<TyreProblemType | null>(
    initial?.tyreProblemType ?? null,
  );

  const problemOption = problem
    ? PROBLEM_OPTIONS.find((o) => o.value === problem) ?? null
    : null;
  const isReplacement = problemOption?.defaultJobType === 'REPLACEMENT';

  return (
    <Stack gap="5">
      <Stack
        gap="3"
        p={{ base: '4', md: '5' }}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.subtle"
        bg="bg.surface"
      >
        <Stack gap="1">
          <Text fontFamily="heading" color="accent.neon" fontSize="lg">
            What do you need help with?
          </Text>
          <Text color="fg.muted" fontSize="sm">
            Choose the closest option. We&apos;ll keep this quick because it&apos;s an
            emergency.
          </Text>
        </Stack>

        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="3">
          {PROBLEM_OPTIONS.map((opt) => (
            <ProblemCard
              key={opt.value}
              title={opt.title}
              description={opt.description}
              active={problem === opt.value}
              onClick={() => {
                setProblem(opt.value);
                if (opt.defaultJobType === 'ASSESSMENT') {
                  // Puncture / flat path: skip tyre selection entirely.
                  onContinue({
                    jobType: 'ASSESSMENT',
                    tyreProblemType: opt.value,
                    selectedTyre: null,
                    backupTyre: null,
                  });
                }
              }}
            />
          ))}
        </Grid>
      </Stack>

      <Box
        p={{ base: '3', md: '4' }}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.subtle"
        bg="bg.surface"
      >
        <HStack gap="3" wrap="wrap" justify="space-between" align="center">
          <Stack gap="0" flex="1" minW="0">
            <Text fontFamily="heading" color="accent.neon" fontSize="md">
              Don&apos;t know your tyre size?
            </Text>
            <Text color="fg.muted" fontSize="sm">
              Skip tyre selection — we&apos;ll inspect on site and quote a repair or
              replacement.
            </Text>
          </Stack>
          <GoldButton
            variant="outline"
            size="sm"
            onClick={() =>
              onContinue({
                jobType: 'ASSESSMENT',
                tyreProblemType: 'NOT_SURE',
                selectedTyre: null,
                backupTyre: null,
              })
            }
          >
            Book without tyre size
          </GoldButton>
        </HStack>
      </Box>

      {isReplacement && problem && (
        <CatalogPicker
          vehicle={vehicle}
          mode="replacement"
          initialSelected={initial?.selectedTyre ?? null}
          onContinue={(picked) => {
            if (!picked) return;
            onContinue({
              jobType: 'REPLACEMENT',
              tyreProblemType: problem,
              selectedTyre: picked,
              backupTyre: null,
            });
          }}
        />
      )}

      <HStack gap="3" wrap="wrap">
        <GoldButton onClick={onBack} variant="ghost">
          Back
        </GoldButton>
      </HStack>
    </Stack>
  );
}

const CardButton = chakra('button');

function ProblemCard({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <CardButton
      type="button"
      onClick={onClick}
      textAlign="left"
      p="4"
      borderRadius="lg"
      borderWidth="1px"
      borderColor={active ? 'border.gold' : 'border.subtle'}
      bg={active ? 'rgba(212,175,55,0.10)' : 'bg.canvas'}
      cursor="pointer"
      _hover={{ borderColor: 'border.gold' }}
    >
      <Stack gap="1">
        <Text fontFamily="heading" color={active ? 'accent.neon' : 'fg.default'} fontSize="md">
          {title}
        </Text>
        <Text color="fg.muted" fontSize="sm">
          {description}
        </Text>
      </Stack>
    </CardButton>
  );
}

function AssessmentRecommendCard(_props: {
  onContinueAssessment: () => void;
  onShowBackup: () => void;
}) {
  // Deprecated: assessment path now skips directly to the location step from
  // the problem-card click. Component intentionally renders nothing and is
  // retained only to avoid breaking any external imports.
  void _props;
  return null;
}

interface CatalogPickerProps {
  vehicle: VehicleSelection | null;
  mode: 'replacement' | 'backup';
  initialSelected: SelectedTyre | null;
  onContinue: (tyre: SelectedTyre | null) => void;
  onBackToTriage?: () => void;
}

function CatalogPicker({
  vehicle,
  mode,
  initialSelected,
  onContinue,
  onBackToTriage,
}: CatalogPickerProps) {
  const initialSize = vehicle?.manualTyreSize ?? '';
  const [size, setSize] = useState<string>(initialSize);
  const [tier, setTier] = useState<TyreTier | ''>('');
  const [type, setType] = useState<TyreType | ''>('');
  const [items, setItems] = useState<TyreSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedTyre | null>(initialSelected);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (size) params.set('sizeLabel', size);
    if (tier) params.set('tier', tier);
    if (type) params.set('type', type);
    params.set('limit', '30');
    return params.toString();
  }, [size, tier, type]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tyres/search?${queryString}`, { cache: 'no-store' });
        const data: SearchResponse | { error: string } = await res.json();
        if (!res.ok) {
          if (!cancelled) setError('Could not load tyres.');
          return;
        }
        if (!cancelled) setItems((data as SearchResponse).items);
      } catch {
        if (!cancelled) setError('Could not load tyres.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const titleCopy =
    mode === 'backup' ? 'Optional backup tyre' : 'Choose your replacement tyre';
  const helpCopy =
    mode === 'backup'
      ? 'If repair is not possible, we will offer this tyre on site. You can also continue without choosing one.'
      : 'Pick the tyre you want fitted on the callout.';

  return (
    <Stack gap="4">
      <Stack gap="1">
        <Text fontFamily="heading" color="accent.neon" fontSize="lg">
          {titleCopy}
        </Text>
        <Text color="fg.muted" fontSize="sm">
          {helpCopy}
        </Text>
      </Stack>

      <Stack
        gap="3"
        p={{ base: '4', md: '5' }}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.subtle"
        bg="bg.surface"
      >
        <Stack gap="2">
          <Text color="fg.default" fontWeight="600">
            Tyre size
          </Text>
          <Flex gap="2" wrap="wrap">
            <Chip active={size === ''} onClick={() => setSize('')}>
              All sizes
            </Chip>
            {COMMON_TYRE_SIZES.map((s) => (
              <Chip key={s} active={size === s} onClick={() => setSize(s)}>
                {s}
              </Chip>
            ))}
          </Flex>
        </Stack>

        <Stack gap="2">
          <Text color="fg.default" fontWeight="600">
            Tier
          </Text>
          <Flex gap="2" wrap="wrap">
            <Chip active={tier === ''} onClick={() => setTier('')}>
              Any
            </Chip>
            {TIER_OPTIONS.map((t) => (
              <Chip key={t.value} active={tier === t.value} onClick={() => setTier(t.value)}>
                {t.label}
              </Chip>
            ))}
          </Flex>
        </Stack>

        <Stack gap="2">
          <Text color="fg.default" fontWeight="600">
            Type
          </Text>
          <Flex gap="2" wrap="wrap">
            <Chip active={type === ''} onClick={() => setType('')}>
              Any
            </Chip>
            {TYPE_OPTIONS.map((t) => (
              <Chip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
                {t.label}
              </Chip>
            ))}
          </Flex>
        </Stack>
      </Stack>

      {loading && <QuoteLoadingState message="Loading tyre options…" />}
      {error && <QuoteErrorState message={error} onRetry={() => setSize((s) => s)} />}
      {!loading && !error && items.length === 0 && (
        <QuoteEmptyState message="No tyres match these filters yet. Adjust the filters or call us for help." />
      )}

      {!loading && !error && items.length > 0 && (
        <Box>
          <Grid
            templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
            gap={{ base: '3', md: '4' }}
          >
            {items.map((t) => (
              <TyreOptionCard
                key={t.tyreId}
                tyre={t}
                selected={selected?.tyreId === t.tyreId}
                onSelect={(tyre) => setSelected(tyre)}
              />
            ))}
          </Grid>
        </Box>
      )}

      <HStack gap="3" wrap="wrap">
        {onBackToTriage && (
          <GoldButton onClick={onBackToTriage} variant="ghost">
            Back to assessment
          </GoldButton>
        )}
        {mode === 'backup' && (
          <GoldButton onClick={() => onContinue(null)} variant="outline">
            Continue without a backup tyre
          </GoldButton>
        )}
        <GoldButton onClick={() => selected && onContinue(selected)} variant="solid">
          {mode === 'backup'
            ? 'Continue with this backup tyre'
            : 'Continue with selected tyre'}
        </GoldButton>
      </HStack>
    </Stack>
  );
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const ChipButton = chakra('button');

function Chip({ active, onClick, children }: ChipProps) {
  return (
    <ChipButton
      type="button"
      onClick={onClick}
      px="3"
      py="1.5"
      borderRadius="full"
      borderWidth="1px"
      borderColor={active ? 'border.gold' : 'border.subtle'}
      bg={active ? 'rgba(212,175,55,0.12)' : 'bg.canvas'}
      color={active ? 'accent.neon' : 'fg.default'}
      fontSize="sm"
      cursor="pointer"
      _hover={{ borderColor: 'border.gold' }}
    >
      {children}
    </ChipButton>
  );
}
