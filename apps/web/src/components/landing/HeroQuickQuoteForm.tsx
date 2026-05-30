'use client';

import {
  Box,
  Button,
  Heading,
  Input,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { siteConfig } from '@/lib/site-config';
import { COMMON_TYRE_SIZES } from '@/lib/quote/tyres';

interface TyreSizesResponse {
  sizes: string[];
  count: number;
}

/** Loose UK postcode pattern — full or outward only. */
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?(\s*\d[A-Z]{2})?$/i;
/** UK mobile / landline — 10-11 digits, optional + prefix. */
const UK_PHONE = /^\+?\d[\d\s-]{8,13}\d$/;
/** Tyre size like 205/55R16, 205/55 R16, 205/55ZR17. */
const TYRE_SIZE = /^\d{3}\/\d{2}\s?Z?R\d{2}$/i;

function buildHref(message: string): string {
  const base = siteConfig.whatsappHref;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}text=${encodeURIComponent(message)}`;
}

export function HeroQuickQuoteForm(): React.ReactNode {
  const [postcode, setPostcode] = useState('');
  const [tyreSize, setTyreSize] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [liveSizes, setLiveSizes] = useState<string[]>([]);

  const datalistId = useId();
  const errorId = useId();

  // Fetch live in-stock sizes; fall back silently to COMMON_TYRE_SIZES.
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/tyres/sizes', { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<TyreSizesResponse>) : null))
      .then((data) => {
        if (data && Array.isArray(data.sizes)) setLiveSizes(data.sizes);
      })
      .catch(() => {
        /* offline / blocked — datalist still has COMMON_TYRE_SIZES */
      });
    return () => controller.abort();
  }, []);

  const sizeOptions = useMemo(() => {
    const merged = new Set<string>([...COMMON_TYRE_SIZES, ...liveSizes]);
    return Array.from(merged).sort();
  }, [liveSizes]);

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const pc = postcode.trim();
    const ts = tyreSize.trim();
    const ph = phone.trim();

    if (!UK_POSTCODE.test(pc)) {
      setError('Please enter a valid UK postcode.');
      return;
    }
    if (ts.length > 0 && !TYRE_SIZE.test(ts)) {
      setError('Tyre size should look like 205/55R16. Leave blank if unsure.');
      return;
    }
    if (!UK_PHONE.test(ph)) {
      setError('Please enter a valid UK mobile number.');
      return;
    }
    setError(null);

    const lines = [
      'Hi, I need a quick fitted tyre price.',
      `Postcode: ${pc.toUpperCase()}`,
      ts.length > 0 ? `Tyre size: ${ts.toUpperCase()}` : 'Tyre size: not sure — please assess',
      `Mobile: ${ph}`,
    ];
    const href = buildHref(lines.join('\n'));
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  return (
    <Box
      as="form"
      // @ts-expect-error Chakra v3 Box typing narrows to HTMLDivElement for events
      onSubmit={onSubmit}
      mt={{ base: '4', md: '6' }}
      p={{ base: '4', md: '5' }}
      bg="rgba(255,255,255,0.03)"
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="lg"
      maxW="2xl"
      noValidate
    >
      <Stack gap="1" mb="3">
        <Heading
          as="h2"
          fontFamily="heading"
          fontSize={{ base: 'md', md: 'lg' }}
          letterSpacing="0.04em"
          textTransform="uppercase"
          color="fg.default"
        >
          Get a 60-second quote
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          Three quick details. We&rsquo;ll text you a fitted price.
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, sm: 3 }} gap="2" mb="3">
        <Input
          name="postcode"
          placeholder="Postcode"
          autoComplete="postal-code"
          inputMode="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          bg="rgba(0,0,0,0.4)"
          borderColor="border.subtle"
          color="fg.default"
          _placeholder={{ color: 'fg.muted' }}
          _focus={{ borderColor: 'accent.solid', boxShadow: 'none' }}
          aria-required="true"
          aria-invalid={error !== null && !UK_POSTCODE.test(postcode.trim())}
          aria-describedby={error ? errorId : undefined}
          required
        />
        <Input
          name="tyreSize"
          placeholder="Tyre size (e.g. 205/55R16)"
          list={datalistId}
          autoComplete="off"
          value={tyreSize}
          onChange={(e) => setTyreSize(e.target.value)}
          bg="rgba(0,0,0,0.4)"
          borderColor="border.subtle"
          color="fg.default"
          _placeholder={{ color: 'fg.muted' }}
          _focus={{ borderColor: 'accent.solid', boxShadow: 'none' }}
        />
        <Input
          name="phone"
          type="tel"
          placeholder="Mobile number"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          bg="rgba(0,0,0,0.4)"
          borderColor="border.subtle"
          color="fg.default"
          _placeholder={{ color: 'fg.muted' }}
          _focus={{ borderColor: 'accent.solid', boxShadow: 'none' }}
          aria-required="true"
          aria-invalid={error !== null && !UK_PHONE.test(phone.trim())}
          aria-describedby={error ? errorId : undefined}
          required
        />
      </SimpleGrid>

      {/* Native autocomplete — works on all browsers, no extra deps. */}
      <datalist id={datalistId}>
        {sizeOptions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <Button
        type="submit"
        width="full"
        bg="#25D366"
        color="white"
        fontWeight="700"
        fontSize={{ base: 'md', md: 'lg' }}
        minH="52px"
        borderRadius="md"
        _hover={{ bg: '#1DA851' }}
        _active={{ bg: '#178D44' }}
      >
        <FaWhatsapp aria-hidden style={{ marginRight: '10px' }} size={18} />
        Send via WhatsApp &rarr;
      </Button>

      {error ? (
        <Text id={errorId} role="alert" color="#FF6B6B" fontSize="sm" mt="2">
          {error}
        </Text>
      ) : (
        <Text color="fg.muted" fontSize="xs" mt="2">
          No spam &mdash; we only contact you about your tyre.
        </Text>
      )}
    </Box>
  );
}

export default HeroQuickQuoteForm;
