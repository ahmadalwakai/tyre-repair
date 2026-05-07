import { JsonLd } from './JsonLd';
import { buildFaqSchema } from '@/lib/seo/schema';
import type { ServiceFaqItem, LocationFaqItem } from '@/types/seo';

export interface FaqJsonLdProps {
  items: readonly (ServiceFaqItem | LocationFaqItem)[];
  pageId?: string;
}

export function FaqJsonLd({ items, pageId }: FaqJsonLdProps): React.JSX.Element | null {
  if (items.length === 0) return null;
  return <JsonLd id={`ld-faq-${pageId ?? 'page'}`} data={buildFaqSchema(items)} />;
}
