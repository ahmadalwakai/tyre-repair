/**
 * Mirror of `PricingTodayReport` from
 * `apps/web/src/app/api/admin/reports/pricing-today/route.ts`.
 * Keep field names in sync.
 */
export interface PricingTodayReport {
  date: string;
  pricingReviewJobsToday: number;
  publicCallFirstBlocksToday: number;
  longDistanceAssessmentJobsToday: number;
  cashHighRiskJobsToday: number;
  overridesAppliedToday: number;
  belowMinimumOverridesToday: number;
  generatedAt: string;
}
