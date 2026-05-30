/**
 * Mirror of the server-side PricingThresholds document stored under
 * app_settings.key = 'pricing'. Keep keys in sync with
 * apps/web/src/lib/settings/pricing-settings.ts.
 */
export interface PricingThresholds {
  normal_distance_miles: number;
  review_distance_miles: number;
  high_risk_distance_miles: number;
  max_auto_quote_distance_miles: number;
  long_distance_assessment_threshold_miles: number;
  very_long_distance_assessment_threshold_miles: number;
  long_distance_assessment_min_gbp: number;
}

export interface PricingThresholdsResponse {
  key: 'pricing';
  defaults: PricingThresholds;
  effective: PricingThresholds;
}

export interface PricingThresholdsPatchResponse {
  key: 'pricing';
  effective: PricingThresholds;
}

export type PricingThresholdKey = keyof PricingThresholds;
