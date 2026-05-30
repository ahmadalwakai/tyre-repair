export type SeoIssueSeverity = 'error' | 'warning' | 'info';
export type SeoIssueField =
  | 'title'
  | 'description'
  | 'h1'
  | 'intro'
  | 'keywords'
  | 'noindex';

export interface SeoIssue {
  field: SeoIssueField;
  severity: SeoIssueSeverity;
  message: string;
  suggested?: string;
}

export interface SeoPageHealth {
  path: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: SeoIssue[];
}

export interface SeoPageEffective {
  path: string;
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  keywords: string[];
  noindex: boolean;
}

export interface SeoPageOverride {
  path: string;
  label: string | null;
  title: string | null;
  description: string | null;
  h1: string | null;
  intro: string | null;
  keywords: string[];
  noindex: boolean;
  notes: string | null;
  updatedAt: string;
}

export interface SeoPageDefaults {
  path: string;
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  keywords: string[];
}

export interface SeoPageAdminRow {
  effective: SeoPageEffective;
  defaults: SeoPageDefaults;
  override: SeoPageOverride | null;
  health: SeoPageHealth;
}

export interface SeoPageWritePatch {
  title?: string | null;
  description?: string | null;
  h1?: string | null;
  intro?: string | null;
  keywords?: string[] | null;
  noindex?: boolean | null;
  notes?: string | null;
  reset?: boolean;
}
