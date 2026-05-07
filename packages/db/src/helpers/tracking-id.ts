import { customAlphabet } from 'nanoid';

// Excludes I, O, 0, 1
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generate = customAlphabet(ALPHABET, 6);

export function generateTrackingId(): string {
  return `TR-${generate()}`;
}
