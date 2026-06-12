import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  // Always prefix the locale (/en, /fr) — keeps hreflang + canonicals unambiguous.
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
