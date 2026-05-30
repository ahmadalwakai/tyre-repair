import { JsonLd } from './JsonLd';
import {
  buildLocalBusinessSchema,
  buildOrganizationSchema,
  buildWebsiteSchema,
} from '@/lib/seo/schema';

/**
 * Site-wide LocalBusiness + Organization + WebSite graph. Render once per
 * page (e.g. layout or homepage). Stable `@id` values let other schema
 * reference the business and the legal organization independently.
 */
export function LocalBusinessJsonLd(): React.JSX.Element {
  return (
    <>
      <JsonLd id="ld-website" data={buildWebsiteSchema()} />
      <JsonLd id="ld-organization" data={buildOrganizationSchema()} />
      <JsonLd id="ld-business" data={buildLocalBusinessSchema()} />
    </>
  );
}
