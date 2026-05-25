/**
 * Pure helpers for the mobile-first conversion UX layer.
 *
 * The mobile bottom-bar / help-sheet system reads route context here to decide
 * which actions to surface. Keep this file pure (no React, no DOM access) so
 * it stays cheap to import and easy to test.
 *
 * Design rules (must not be broken without explicit business approval):
 *   - Never overlap the Stripe Payment Element on /checkout.
 *   - Never compete with the existing StickyQuoteActions on /quote.
 *   - Maximum 3 visible primary actions at once (rest go in a More sheet).
 *   - Call action is always reachable.
 */

export type MobileRouteContext =
  | 'home'
  | 'quote'
  | 'checkout'
  | 'checkout_terminal' // success / cancelled
  | 'tracking'
  | 'service_or_location'
  | 'other';

export function classifyRoute(pathname: string | null | undefined): MobileRouteContext {
  if (!pathname) return 'other';
  const path = pathname.toLowerCase();

  if (path === '/' || path === '') return 'home';
  if (path === '/quote' || path.startsWith('/quote?') || path.startsWith('/quote/')) {
    return 'quote';
  }
  if (path === '/checkout' || path.startsWith('/checkout?')) return 'checkout';
  if (path.startsWith('/checkout/')) return 'checkout_terminal';
  if (path.startsWith('/track/') || path === '/track') return 'tracking';
  if (path.startsWith('/services/') || path.startsWith('/locations/')) {
    return 'service_or_location';
  }
  return 'other';
}

/**
 * Should the smart mobile action bar render at all on this route?
 *
 * - On /quote we already have StickyQuoteActions — adding another bar would
 *   double up the bottom of the viewport.
 * - On /checkout we must never cover the Stripe Payment Element. The lightweight
 *   "Need help" pill is rendered separately as a smaller affordance.
 */
export function shouldRenderMobileActionBar(ctx: MobileRouteContext): boolean {
  switch (ctx) {
    case 'home':
    case 'service_or_location':
    case 'tracking':
    case 'checkout_terminal':
    case 'other':
      return true;
    case 'quote':
    case 'checkout':
      return false;
  }
}

/**
 * Should the small floating "Need help?" pill render?
 *
 * On /checkout we still want a low-friction escape hatch for stressed
 * customers, but it must be tiny and never near the payment button.
 */
export function shouldRenderHelpPill(ctx: MobileRouteContext): boolean {
  return ctx === 'checkout';
}

/**
 * Show the resume-quote nudge?
 *
 * Skip on /quote (the page already has its own RestoreQuotePrompt) and on
 * checkout flows (we never want to pull a paying customer back into the
 * funnel).
 */
export function shouldOfferResumeQuote(ctx: MobileRouteContext): boolean {
  return ctx === 'home' || ctx === 'service_or_location' || ctx === 'other';
}

/**
 * Minimum scroll (in px) before we reveal the bar on routes where we don't
 * need it instantly. We want the customer to read the hero first.
 */
export const MOBILE_BAR_REVEAL_SCROLL_PX = 280;

/**
 * Routes where the bar should appear immediately (no scroll gate).
 *
 * Homepage is included so emergency mobile users have Call / Quote / More at
 * thumb level on first paint without needing to scroll past the hero.
 */
export function revealsBarImmediately(ctx: MobileRouteContext): boolean {
  return (
    ctx === 'home' ||
    ctx === 'tracking' ||
    ctx === 'checkout_terminal'
  );
}

export interface MobilePrimaryAction {
  /** Stable key used as React key + analytics. */
  key: string;
  label: string;
  /** Either an href (tel:, https://, internal route) or kind === 'sheet'. */
  kind: 'link' | 'sheet';
  href?: string;
  /** Component asks the More sheet to open. */
  sheet?: 'help' | 'progress';
  /** sourceComponent passed to call-click tracking when href is tel:. */
  callTrackingSource?: string;
  /** True for the gold/primary visual treatment. Max one per bar. */
  primary?: boolean;
  /** External link (target=_blank). */
  external?: boolean;
}

export interface ActionContextInput {
  ctx: MobileRouteContext;
  hasSavedQuote: boolean;
  phoneHref: string;
  phoneDisplay: string;
  whatsappHref: string;
  primaryCtaHref: string;
}

/**
 * Resolve up to 3 visible buttons + an implicit "More" trigger for the bar.
 * Order matters: leftmost = least urgent, rightmost = primary.
 */
export function resolveBarActions(input: ActionContextInput): MobilePrimaryAction[] {
  const { ctx, hasSavedQuote, phoneHref, primaryCtaHref } = input;

  const callAction: MobilePrimaryAction = {
    key: 'call',
    label: 'Call',
    kind: 'link',
    href: phoneHref,
    callTrackingSource: 'MobileActionBar.call',
    primary: true,
  };

  switch (ctx) {
    case 'home':
    case 'service_or_location':
    case 'other': {
      const quoteAction: MobilePrimaryAction = {
        key: hasSavedQuote ? 'continue-quote' : 'get-quote',
        label: hasSavedQuote ? 'Continue quote' : 'Get quote',
        kind: 'link',
        href: primaryCtaHref,
      };
      return [
        { key: 'more', label: 'More', kind: 'sheet', sheet: 'help' },
        quoteAction,
        callAction,
      ];
    }
    case 'tracking':
      return [
        { key: 'more', label: 'More', kind: 'sheet', sheet: 'help' },
        {
          key: 'whatsapp',
          label: 'WhatsApp',
          kind: 'link',
          href: input.whatsappHref,
          external: true,
        },
        callAction,
      ];
    case 'checkout_terminal':
      return [
        { key: 'more', label: 'More', kind: 'sheet', sheet: 'help' },
        { key: 'home', label: 'Home', kind: 'link', href: '/' },
        callAction,
      ];
    case 'quote':
    case 'checkout':
      // Bar is hidden on these — see shouldRenderMobileActionBar.
      return [callAction];
  }
}
