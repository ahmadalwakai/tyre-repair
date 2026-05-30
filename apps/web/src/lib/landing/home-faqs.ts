import type { LandingFaqItem } from '@/types/landing';

/**
 * Homepage FAQ items. Shared between the visible accordion section and the
 * FAQPage JSON-LD on `/` so the rendered copy and the structured data stay
 * in sync. Edit answers here only.
 */
export const HOME_FAQS: readonly LandingFaqItem[] = [
  {
    id: 'coverage',
    question: 'Do you cover my area?',
    answer:
      'TyreRepair UK runs a mobile fleet of vans and drivers covering the whole of Scotland — we come to you. The quote flow calculates travel time to your location automatically.',
  },
  {
    id: 'later',
    question: 'Can I book for later?',
    answer:
      'The service is built around emergency callouts. The system prices the job for now and does not ask customers to choose a date or time.',
  },
  {
    id: 'stock',
    question: 'What happens if my tyre is not in stock?',
    answer:
      'The site will show "Special order — fitted within 3 working days" before payment.',
  },
  {
    id: 'payments',
    question: 'Can I pay by card?',
    answer:
      'Yes. Secure card payments are handled through Stripe, with supported wallet and 3D Secure options where available.',
  },
  {
    id: 'account',
    question: 'Do I need an account?',
    answer: 'No. The customer flow is guest checkout only.',
  },
  {
    id: 'tracking',
    question: 'Can I track my booking?',
    answer:
      'Yes. Every booking receives a tracking ID and tracking link after confirmation.',
  },
  {
    id: 'no-size',
    question: 'What if I do not know my tyre size?',
    answer:
      'You can still start a quote. Choose the assessment-first option and we will check the tyre on site before fitting or replacing.',
  },
];
