import { JsonLd } from './JsonLd';
import { buildServiceSchema, type ServiceSchemaInput } from '@/lib/seo/schema';

export function ServiceJsonLd(props: ServiceSchemaInput): React.JSX.Element {
  return <JsonLd id={`ld-service-${props.pathname}`} data={buildServiceSchema(props)} />;
}
