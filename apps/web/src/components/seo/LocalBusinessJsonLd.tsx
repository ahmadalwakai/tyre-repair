import { JsonLd } from './JsonLd';
import { buildLocalBusinessSchema, buildWebsiteSchema } from '@/lib/seo/schema';

/**
 * Site-wide LocalBusiness + WebSite graph. Render once per page (e.g. layout
 * or homepage). Stable `@id` lets other schema reference the business.
 */
export function LocalBusinessJsonLd(): React.JSX.Element {
  return (
    <>
      <JsonLd id="ld-website" data={buildWebsiteSchema()} />
      <JsonLd id="ld-business" data={buildLocalBusinessSchema()} />
    </>
  );
}
