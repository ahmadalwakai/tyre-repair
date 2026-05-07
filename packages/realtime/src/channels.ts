export const ADMIN_CHANNEL = 'private-admin' as const;
export const VISITOR_CHANNEL = 'private-visitors' as const;
export const PRICING_CHANNEL = 'private-pricing' as const;
export const PUBLIC_TRACKING_CHANNEL_PREFIX = 'tracking-' as const;

export type AdminChannel = typeof ADMIN_CHANNEL;
export type VisitorChannel = typeof VISITOR_CHANNEL;
export type PricingChannel = typeof PRICING_CHANNEL;
export type TrackingChannel = `${typeof PUBLIC_TRACKING_CHANNEL_PREFIX}${string}`;

export type RealtimeChannel = AdminChannel | VisitorChannel | PricingChannel | TrackingChannel;

export function trackingChannelFor(trackingId: string): TrackingChannel {
  return `${PUBLIC_TRACKING_CHANNEL_PREFIX}${trackingId}` as TrackingChannel;
}
