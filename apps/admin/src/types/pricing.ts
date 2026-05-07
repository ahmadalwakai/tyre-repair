export interface PricingRule {
  id: string;
  key: string;
  label: string;
  description: string | null;
  numericValue: number;
  isMultiplier: boolean;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface PricingOverride {
  id: string;
  type: 'surge' | 'discount';
  status: 'active' | 'inactive' | 'expired';
  label: string;
  multiplier: number;
  reason: string | null;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}
