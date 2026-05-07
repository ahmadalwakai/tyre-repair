import { JsonLd } from './JsonLd';
import { buildBreadcrumbSchema } from '@/lib/seo/schema';
import type { BreadcrumbItem } from '@/types/seo';

export interface BreadcrumbJsonLdProps {
  items: readonly BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps): React.JSX.Element | null {
  if (items.length === 0) return null;
  return <JsonLd id={`ld-breadcrumb-${items[items.length - 1]?.href ?? ''}`} data={buildBreadcrumbSchema(items)} />;
}
