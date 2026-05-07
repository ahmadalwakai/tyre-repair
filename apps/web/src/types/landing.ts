import type { ReactNode } from 'react';

export interface LandingNavItem {
  label: string;
  href: string;
}

export interface LandingStat {
  value: string;
  label: string;
  description?: string;
}

export interface LandingService {
  id: string;
  title: string;
  copy: string;
  icon: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface LandingStep {
  step: number;
  title: string;
  copy: string;
}

export interface LandingFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface LandingTestimonial {
  id: string;
  quote: string;
  attribution: string;
}

export interface CoverageCity {
  name: string;
  isHq?: boolean;
}
