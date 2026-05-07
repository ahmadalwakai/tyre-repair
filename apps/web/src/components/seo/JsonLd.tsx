import type { Thing, WithContext } from 'schema-dts';

// schema-dts `Thing` is a wide union including `string`, which causes TS
// generic inference to collapse to `WithContext<string>` at call sites.
// Accept any JSON-LD-shaped object instead, while still letting callers
// produce values via the typed `WithContext<T>` builders for safety.
export type JsonLdData = WithContext<Thing> | WithContext<Thing>[] | Record<string, unknown> | Record<string, unknown>[];

export interface JsonLdProps {
  data: JsonLdData;
  /** Optional id for debugging. */
  id?: string;
}

/**
 * Renders a server-side JSON-LD `<script>` tag.
 *
 * Always SSR — never use a client effect to inject schema, because Googlebot
 * cannot reliably wait for runtime injections.
 */
export function JsonLd({
  data,
  id,
}: JsonLdProps): React.JSX.Element {
  const json = JSON.stringify(data);
  return (
    <script
      {...(id ? { id } : {})}
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON.stringify output is XSS-safe.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
