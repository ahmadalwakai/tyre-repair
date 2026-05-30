/**
 * Pure SEO recommendations / scoring engine.
 *
 * Given the effective SEO values for a page (overrides ?? defaults) this
 * module produces:
 *   - a 0–100 `score` (higher = healthier),
 *   - a list of typed `issues` (severity + actionable suggestion),
 *   - a list of `quickFixes` the admin can one-click apply.
 *
 * No DB, no Next, no I/O — easy to unit-test and reuse.
 */

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
  /** Optional auto-suggested replacement value for the admin to accept. */
  suggested?: string;
}

export interface SeoPageDefaults {
  path: string;
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  keywords: readonly string[];
}

export interface SeoPageEffective {
  path: string;
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  keywords: readonly string[];
  noindex: boolean;
}

export interface SeoPageHealth {
  path: string;
  score: number; // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: SeoIssue[];
}

/* SEO best-practice bounds (tweak in one place). */
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 120;
const DESC_MAX = 170;
const H1_MIN = 15;
const H1_MAX = 70;
const INTRO_MIN = 60;
const INTRO_MAX = 320;
const KEYWORDS_MIN = 2;
const KEYWORDS_MAX = 10;

function clip(s: string, n: number): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > n - 15 ? cut.slice(0, lastSpace) : cut).trim();
}

function gradeFor(score: number): SeoPageHealth['grade'] {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function evaluateSeoPage(effective: SeoPageEffective): SeoPageHealth {
  const issues: SeoIssue[] = [];

  // ---- Title ----------------------------------------------------------
  const title = effective.title.trim();
  if (!title) {
    issues.push({ field: 'title', severity: 'error', message: 'Title is empty.' });
  } else if (title.length < TITLE_MIN) {
    issues.push({
      field: 'title',
      severity: 'warning',
      message: `Title is short (${title.length} chars). Aim for ${TITLE_MIN}–${TITLE_MAX}.`,
    });
  } else if (title.length > TITLE_MAX) {
    issues.push({
      field: 'title',
      severity: 'warning',
      message: `Title is long (${title.length} chars). Google truncates around ${TITLE_MAX}.`,
      suggested: clip(title, TITLE_MAX),
    });
  }
  if (title && !/tyrerepair|tyre/i.test(title)) {
    issues.push({
      field: 'title',
      severity: 'info',
      message: 'Title does not include the word "tyre" — consider adding a primary keyword.',
    });
  }

  // ---- Description ----------------------------------------------------
  const desc = effective.description.trim();
  if (!desc) {
    issues.push({ field: 'description', severity: 'error', message: 'Meta description is empty.' });
  } else if (desc.length < DESC_MIN) {
    issues.push({
      field: 'description',
      severity: 'warning',
      message: `Description is short (${desc.length}). Aim for ${DESC_MIN}–${DESC_MAX}.`,
    });
  } else if (desc.length > DESC_MAX) {
    issues.push({
      field: 'description',
      severity: 'warning',
      message: `Description is long (${desc.length}). SERP truncates around ${DESC_MAX}.`,
      suggested: clip(desc, DESC_MAX),
    });
  }

  // ---- H1 -------------------------------------------------------------
  const h1 = effective.h1.trim();
  if (!h1) {
    issues.push({ field: 'h1', severity: 'error', message: 'On-page H1 is empty.' });
  } else if (h1.length < H1_MIN || h1.length > H1_MAX) {
    issues.push({
      field: 'h1',
      severity: 'info',
      message: `H1 length (${h1.length}) outside ${H1_MIN}–${H1_MAX}.`,
    });
  }
  if (h1 && title && h1.toLowerCase() === title.toLowerCase()) {
    issues.push({
      field: 'h1',
      severity: 'info',
      message: 'H1 is identical to the title — vary the wording for richer ranking signals.',
    });
  }

  // ---- Intro ----------------------------------------------------------
  const intro = effective.intro.trim();
  if (!intro) {
    issues.push({ field: 'intro', severity: 'warning', message: 'Hero intro paragraph is empty.' });
  } else if (intro.length < INTRO_MIN) {
    issues.push({
      field: 'intro',
      severity: 'info',
      message: `Intro is short (${intro.length}). Aim for at least ${INTRO_MIN} chars.`,
    });
  } else if (intro.length > INTRO_MAX) {
    issues.push({
      field: 'intro',
      severity: 'info',
      message: `Intro is long (${intro.length}). Keep under ${INTRO_MAX} for scannability.`,
    });
  }

  // ---- Keywords -------------------------------------------------------
  const keywords = effective.keywords.map((k) => k.trim()).filter((k) => k.length > 0);
  if (keywords.length < KEYWORDS_MIN) {
    issues.push({
      field: 'keywords',
      severity: 'info',
      message: `Only ${keywords.length} keyword(s) defined. Aim for ${KEYWORDS_MIN}–${KEYWORDS_MAX}.`,
    });
  } else if (keywords.length > KEYWORDS_MAX) {
    issues.push({
      field: 'keywords',
      severity: 'info',
      message: `Too many keywords (${keywords.length}). Trim to ${KEYWORDS_MAX} or fewer.`,
    });
  }
  if (keywords.length > 0 && title) {
    const titleLower = title.toLowerCase();
    const used = keywords.some((k) => titleLower.includes(k.toLowerCase()));
    if (!used) {
      issues.push({
        field: 'keywords',
        severity: 'info',
        message: 'None of the configured keywords appears in the title.',
      });
    }
  }
  if (keywords.length > 0 && desc) {
    const descLower = desc.toLowerCase();
    const used = keywords.some((k) => descLower.includes(k.toLowerCase()));
    if (!used) {
      issues.push({
        field: 'keywords',
        severity: 'info',
        message: 'None of the configured keywords appears in the meta description.',
      });
    }
  }

  // ---- Noindex --------------------------------------------------------
  if (effective.noindex) {
    issues.push({
      field: 'noindex',
      severity: 'warning',
      message: 'This page is currently noindex. It will not appear in Google.',
    });
  }

  // ---- Score ----------------------------------------------------------
  const weight: Record<SeoIssueSeverity, number> = { error: 30, warning: 10, info: 3 };
  const deduction = issues.reduce((acc, i) => acc + weight[i.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - deduction));

  return {
    path: effective.path,
    score,
    grade: gradeFor(score),
    issues,
  };
}
