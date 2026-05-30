import type { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';

/**
 * Shared layout for Google Ads landing pages.
 * Conversion-first, but reuses the existing site chrome so navigation,
 * floating call/WhatsApp actions, and footer remain consistent.
 */
export default function LandingPageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <Box as="main">{children}</Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
