'use client';

import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

const STORAGE_KEY = 'tyrerepair:roadside-mode:v1';

/**
 * Local-only "I'm roadside" toggle.
 *
 * Marks the current quote session as roadside in sessionStorage. We do not
 * touch the database schema for this — it's a UX-only signal until the
 * server-side quote/booking schema gains a `is_roadside` column.
 *
 * When toggled on, shows short safety guidance. Never promises response time.
 */
export function RoadsideSafetyChip() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setActive(window.sessionStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  function toggle() {
    const next = !active;
    setActive(next);
    if (typeof window !== 'undefined') {
      try {
        if (next) window.sessionStorage.setItem(STORAGE_KEY, '1');
        else window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <Stack gap="2">
      <HStack gap="2" wrap="wrap">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={active}
          aria-label="I'm roadside"
          style={{
            all: 'unset',
            cursor: 'pointer',
            minHeight: '40px',
            padding: '8px 14px',
            borderRadius: '999px',
            border: active ? '1px solid #FFD700' : '1px solid rgba(212,175,55,0.5)',
            background: active ? 'rgba(255,215,0,0.12)' : 'transparent',
            color: active ? '#FFD700' : '#F5F5F5',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Box as="span" aria-hidden>
            <FiAlertTriangle />
          </Box>
          I&apos;m roadside
        </button>
      </HStack>
      {active && (
        <Box
          p="3"
          borderRadius="md"
          borderWidth="1px"
          borderColor="border.gold"
          bg="bg.surface"
        >
          <Text fontSize="sm" color="fg.default">
            Stay away from traffic and wait in a safe place.
          </Text>
        </Box>
      )}
    </Stack>
  );
}
