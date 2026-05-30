import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldInput } from '@/components/ui/GoldInput';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import {
  getPricingThresholds,
  updatePricingThresholds,
} from '@/lib/api/pricing-settings';
import type {
  PricingThresholdKey,
  PricingThresholds,
} from '@/types/pricing-settings';

interface FieldDef {
  key: PricingThresholdKey;
  label: string;
  hint?: string;
  unit: 'miles' | 'gbp';
  /** Whether values below the previous tier should warn. */
  tier?: 'normal' | 'review' | 'high_risk' | 'max' | 'assess' | 'assess_long' | 'min_gbp';
}

const FIELDS: readonly FieldDef[] = [
  {
    key: 'normal_distance_miles',
    label: 'Normal distance',
    hint: 'Jobs at or below this distance are NORMAL.',
    unit: 'miles',
    tier: 'normal',
  },
  {
    key: 'review_distance_miles',
    label: 'Review distance',
    hint: 'At/above this distance, jobs become REVIEW.',
    unit: 'miles',
    tier: 'review',
  },
  {
    key: 'high_risk_distance_miles',
    label: 'High-risk distance',
    hint: 'At/above this distance, jobs become HIGH_RISK.',
    unit: 'miles',
    tier: 'high_risk',
  },
  {
    key: 'max_auto_quote_distance_miles',
    label: 'Max auto-quote distance',
    hint: 'Above this, mark OUTSIDE_NORMAL_COVERAGE.',
    unit: 'miles',
    tier: 'max',
  },
  {
    key: 'long_distance_assessment_threshold_miles',
    label: 'Long-distance assessment threshold',
    hint: 'Puncture/assessment at/above this distance gets protected.',
    unit: 'miles',
    tier: 'assess',
  },
  {
    key: 'very_long_distance_assessment_threshold_miles',
    label: 'Very long-distance assessment threshold',
    hint: 'At/above this, public payment is blocked for assessments.',
    unit: 'miles',
    tier: 'assess_long',
  },
  {
    key: 'long_distance_assessment_min_gbp',
    label: 'Long-distance assessment minimum (£)',
    hint: 'Recommended minimum total for long-distance assessments.',
    unit: 'gbp',
    tier: 'min_gbp',
  },
];

function isPositiveNumber(s: string): boolean {
  if (s.trim() === '') return false;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0;
}

function tiersValid(values: Record<PricingThresholdKey, string>): string | null {
  const n = (k: PricingThresholdKey): number => Number(values[k]);
  const normal = n('normal_distance_miles');
  const review = n('review_distance_miles');
  const high = n('high_risk_distance_miles');
  const max = n('max_auto_quote_distance_miles');
  const assess = n('long_distance_assessment_threshold_miles');
  const assessLong = n('very_long_distance_assessment_threshold_miles');
  const minGbp = n('long_distance_assessment_min_gbp');
  if (![normal, review, high, max, assess, assessLong, minGbp].every(Number.isFinite)) {
    return 'All values must be valid numbers.';
  }
  if (review < normal) return 'Review distance cannot be lower than Normal distance.';
  if (high < review) return 'High-risk distance cannot be lower than Review distance.';
  if (max < high) return 'Max auto-quote distance cannot be lower than High-risk distance.';
  if (assessLong < assess) {
    return 'Very long-distance assessment threshold cannot be lower than the assessment threshold.';
  }
  if (minGbp <= 0) return 'Long-distance assessment minimum must be greater than 0.';
  return null;
}

function toStringMap(t: PricingThresholds): Record<PricingThresholdKey, string> {
  return {
    normal_distance_miles: String(t.normal_distance_miles),
    review_distance_miles: String(t.review_distance_miles),
    high_risk_distance_miles: String(t.high_risk_distance_miles),
    max_auto_quote_distance_miles: String(t.max_auto_quote_distance_miles),
    long_distance_assessment_threshold_miles: String(
      t.long_distance_assessment_threshold_miles,
    ),
    very_long_distance_assessment_threshold_miles: String(
      t.very_long_distance_assessment_threshold_miles,
    ),
    long_distance_assessment_min_gbp: String(t.long_distance_assessment_min_gbp),
  };
}

/**
 * Inline editor for the `pricing` row in app_settings. Self-contained:
 * loads, validates tier ordering, PATCHes the server, and shows defaults
 * so a non-developer admin can reset confidently.
 */
export function PricingThresholdsCard(): React.JSX.Element {
  const toast = useToast();
  const [defaults, setDefaults] = useState<PricingThresholds | null>(null);
  const [effective, setEffective] = useState<PricingThresholds | null>(null);
  const [values, setValues] = useState<Record<PricingThresholdKey, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getPricingThresholds();
      setDefaults(res.defaults);
      setEffective(res.effective);
      setValues(toStringMap(res.effective));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load pricing thresholds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirtyKeys = useMemo<PricingThresholdKey[]>(() => {
    if (!values || !effective) return [];
    return (Object.keys(values) as PricingThresholdKey[]).filter((k) => {
      const v = Number(values[k]);
      return Number.isFinite(v) && v !== effective[k];
    });
  }, [values, effective]);

  const validationError = useMemo(() => {
    if (!values) return null;
    for (const k of Object.keys(values) as PricingThresholdKey[]) {
      if (!isPositiveNumber(values[k])) return `“${k}” must be a non-negative number.`;
    }
    return tiersValid(values);
  }, [values]);

  const save = useCallback(async (): Promise<void> => {
    if (!values || dirtyKeys.length === 0 || validationError) return;
    setSaving(true);
    setError(null);
    try {
      const patch: Partial<PricingThresholds> = {};
      for (const k of dirtyKeys) {
        const n = Number(values[k]);
        if (Number.isFinite(n)) (patch as Record<string, number>)[k] = n;
      }
      const res = await updatePricingThresholds(patch);
      setEffective(res.effective);
      setValues(toStringMap(res.effective));
      toast.success('Pricing thresholds saved');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not save pricing thresholds';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [values, dirtyKeys, validationError, toast]);

  const reset = useCallback((): void => {
    if (effective) setValues(toStringMap(effective));
  }, [effective]);

  const resetToDefaults = useCallback((): void => {
    if (defaults) setValues(toStringMap(defaults));
  }, [defaults]);

  if (loading) {
    return (
      <GoldCard>
        <Text className="text-text font-semibold text-base mb-2">Pricing thresholds</Text>
        <View className="py-4 flex-row items-center justify-center">
          <ActivityIndicator color="#E30613" />
          <Text className="text-text-dim text-sm ml-2">Loading…</Text>
        </View>
      </GoldCard>
    );
  }

  if (error && !values) {
    return (
      <GoldCard>
        <Text className="text-text font-semibold text-base mb-2">Pricing thresholds</Text>
        <Text className="text-danger text-sm mb-2">{error}</Text>
        <GoldButton label="Retry" onPress={() => void load()} />
      </GoldCard>
    );
  }

  if (!values || !defaults || !effective) return <View />;

  return (
    <GoldCard>
      <Text className="text-text font-semibold text-base mb-1">Pricing thresholds</Text>
      <Text className="text-text-dim text-xs mb-3">
        Stored under app_settings.pricing. Missing values fall back to safe defaults.
      </Text>

      <View className="gap-3">
        {FIELDS.map((f) => {
          const current = values[f.key];
          const def = defaults[f.key];
          const eff = effective[f.key];
          const changed = Number(current) !== eff;
          return (
            <View key={f.key}>
              <GoldInput
                label={`${f.label}${f.unit === 'gbp' ? '' : ' (mi)'}`}
                value={current}
                onChangeText={(t) =>
                  setValues((prev) => (prev ? { ...prev, [f.key]: t } : prev))
                }
                keyboardType="decimal-pad"
              />
              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-text-dim text-[11px] flex-1 pr-2">{f.hint}</Text>
                <Text className={`text-[11px] ${changed ? 'text-warning' : 'text-text-dim'}`}>
                  default {def}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {validationError ? (
        <Text className="text-danger text-xs mt-3">{validationError}</Text>
      ) : null}
      {error ? <Text className="text-danger text-xs mt-2">{error}</Text> : null}

      <View className="flex-row items-center gap-2 mt-4">
        <View className="flex-1">
          <GoldButton
            label={saving ? 'Saving…' : `Save${dirtyKeys.length ? ` (${dirtyKeys.length})` : ''}`}
            onPress={() => void save()}
            loading={saving}
            disabled={
              saving || dirtyKeys.length === 0 || validationError !== null
            }
          />
        </View>
        <View className="w-28">
          <GoldButton
            label="Revert"
            variant="secondary"
            onPress={reset}
            disabled={saving || dirtyKeys.length === 0}
          />
        </View>
      </View>
      <View className="mt-2">
        <GoldButton
          label="Load safe defaults"
          variant="secondary"
          onPress={resetToDefaults}
          disabled={saving}
        />
      </View>
    </GoldCard>
  );
}
