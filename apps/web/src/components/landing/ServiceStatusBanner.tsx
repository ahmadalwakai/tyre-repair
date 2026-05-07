'use client';
import { useEffect, useState } from 'react';
import { Box, Container, Flex, Stack, Text } from '@chakra-ui/react';
import { FiAlertCircle, FiAlertOctagon, FiInfo } from 'react-icons/fi';

type Variant = 'INFO' | 'WARNING' | 'EMERGENCY';

interface PromoBannerData {
  message: string;
  variant: Variant;
}

interface ServiceAvailabilityData {
  mode: 'NORMAL' | 'HIGH_DEMAND' | 'CALL_FIRST' | 'TEMPORARILY_LIMITED';
  headline: string;
  detail: string;
}

const VARIANT_STYLES: Record<
  Variant,
  { bg: string; borderColor: string; color: string; icon: React.ComponentType }
> = {
  INFO: { bg: 'rgba(56,189,248,0.08)', borderColor: 'sky.400', color: 'sky.200', icon: FiInfo },
  WARNING: {
    bg: 'rgba(234,179,8,0.10)',
    borderColor: 'yellow.400',
    color: 'yellow.200',
    icon: FiAlertCircle,
  },
  EMERGENCY: {
    bg: 'rgba(220,38,38,0.10)',
    borderColor: 'red.400',
    color: 'red.200',
    icon: FiAlertOctagon,
  },
};

/**
 * Public service status + promo banner (Admin Efficiency Pack F11/F12).
 * Hidden when both feeds are absent or in their "all clear" states.
 */
export function ServiceStatusBanner() {
  const [promo, setPromo] = useState<PromoBannerData | null>(null);
  const [availability, setAvailability] = useState<ServiceAvailabilityData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [pRes, aRes] = await Promise.all([
          fetch('/api/public/promo-banner', { cache: 'no-store' }),
          fetch('/api/public/service-availability', { cache: 'no-store' }),
        ]);
        if (cancelled) return;
        if (pRes.ok) {
          const pj = (await pRes.json()) as { banner: PromoBannerData | null };
          setPromo(pj.banner);
        }
        if (aRes.ok) {
          const aj = (await aRes.json()) as ServiceAvailabilityData;
          setAvailability(aj);
        }
      } catch {
        // Banner is non-critical; fail silently.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return null;
  const showAvailability = availability && availability.mode !== 'NORMAL';
  if (!promo && !showAvailability) return null;

  return (
    <Box as="section" px={{ base: '4', md: '6' }} pt={{ base: '4', md: '5' }} bg="bg.canvas">
      <Container maxW="7xl">
        <Stack gap="3">
          {showAvailability ? (
            <BannerRow
              variant={availability.mode === 'TEMPORARILY_LIMITED' ? 'EMERGENCY' : 'WARNING'}
              headline={availability.headline}
              detail={availability.detail}
            />
          ) : null}
          {promo ? (
            <BannerRow variant={promo.variant} headline={promo.message} />
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}

function BannerRow({
  variant,
  headline,
  detail,
}: {
  variant: Variant;
  headline: string;
  detail?: string;
}) {
  const style = VARIANT_STYLES[variant];
  const Icon = style.icon;
  return (
    <Box
      borderRadius="md"
      borderWidth="1px"
      borderColor={style.borderColor}
      bg={style.bg}
      px={{ base: '3', md: '4' }}
      py={{ base: '2', md: '3' }}
      role="status"
    >
      <Flex align="center" gap="3">
        <Box color={style.color} fontSize="lg" aria-hidden>
          <Icon />
        </Box>
        <Stack gap="0.5" flex="1">
          <Text fontSize="sm" fontWeight="semibold" color={style.color}>
            {headline}
          </Text>
          {detail ? (
            <Text fontSize="xs" color="fg.muted">
              {detail}
            </Text>
          ) : null}
        </Stack>
      </Flex>
    </Box>
  );
}

export default ServiceStatusBanner;
