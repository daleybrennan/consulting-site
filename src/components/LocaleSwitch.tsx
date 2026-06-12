'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

// Toggles between en/fr, preserving the current path.
export function LocaleSwitch() {
  const locale = useLocale();
  const t = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();

  const other = routing.locales.find((l) => l !== locale)!;

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: other })}
      className="text-xs uppercase tracking-[0.16em] text-muted transition-colors hover:text-accent"
      aria-label={`${t('switchTo')}`}
    >
      <span aria-hidden="true">{locale.toUpperCase()}</span>
      <span className="mx-1 text-line" aria-hidden="true">/</span>
      <span className="text-ink/40">{other.toUpperCase()}</span>
    </button>
  );
}
