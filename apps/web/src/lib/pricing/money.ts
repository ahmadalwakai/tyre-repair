import type { MoneyGbp } from './types';

const PENCE_PER_POUND = 100;

function parseAmount(amount: string | number): number {
  if (typeof amount === 'number') {
    if (!Number.isFinite(amount)) return 0;
    return amount;
  }
  const n = Number(amount);
  return Number.isFinite(n) ? n : 0;
}

export function toPence(amountGbp: string | number): number {
  return Math.round(parseAmount(amountGbp) * PENCE_PER_POUND);
}

export function fromPence(pence: number): MoneyGbp {
  const safe = Math.round(pence);
  return (safe / PENCE_PER_POUND).toFixed(2);
}

export function roundGbp(amount: number): MoneyGbp {
  return fromPence(Math.round(parseAmount(amount) * PENCE_PER_POUND));
}

export function multiplyMoney(amountGbp: string | number, multiplier: number): MoneyGbp {
  const safeMul = Number.isFinite(multiplier) ? multiplier : 1;
  return roundGbp(parseAmount(amountGbp) * safeMul);
}

export function addMoney(...amountsGbp: Array<string | number>): MoneyGbp {
  const totalPence = amountsGbp.reduce<number>((acc, a) => acc + toPence(a), 0);
  return fromPence(totalPence);
}
