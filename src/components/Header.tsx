'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitch } from './LocaleSwitch';

const NAV = [
  { href: '/export-strategy', key: 'exportStrategy' },
  { href: '/advisory', key: 'advisory' },
  { href: '/distributor-finder', key: 'distributorFinder' },
  { href: '/speaking', key: 'speaking' },
  { href: '/about', key: 'about' },
] as const;

export function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* Desktop: wordmark left, everything else flush right on one line */}
        <div className="hidden items-center justify-between py-5 lg:flex">
          <Link
            href="/"
            className="font-display text-[1.35rem] tracking-tight text-ink"
          >
            Daley Brennan
          </Link>

          <div className="flex items-center gap-9 whitespace-nowrap">
            <nav className="flex items-center gap-9" aria-label="Primary">
              {NAV.map(({ href, key }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative text-[13px] tracking-[0.04em] transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-left after:bg-accent after:transition-transform after:duration-300 hover:text-accent ${
                      active
                        ? 'text-accent after:scale-x-100'
                        : 'text-ink-soft after:scale-x-0 hover:after:scale-x-100'
                    }`}
                  >
                    {t(key)}
                  </Link>
                );
              })}
            </nav>

            <span className="h-4 w-px bg-line" aria-hidden="true" />
            <LocaleSwitch />
            <Link
              href="/contact"
              className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-accent"
            >
              {t('contact')}
            </Link>
          </div>
        </div>

        {/* Mobile: logo left, controls right */}
        <div className="flex items-center justify-between py-4 lg:hidden">
          <Link
            href="/"
            className="font-display text-xl tracking-tight text-ink"
            onClick={() => setOpen(false)}
          >
            Daley Brennan
          </Link>
          <div className="flex items-center gap-4">
            <LocaleSwitch />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label="Menu"
              className="flex h-10 w-10 flex-col items-center justify-center gap-1.5"
            >
              <span
                className={`block h-px w-6 bg-ink transition-transform ${
                  open ? 'translate-y-[7px] rotate-45' : ''
                }`}
              />
              <span
                className={`block h-px w-6 bg-ink transition-opacity ${
                  open ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block h-px w-6 bg-ink transition-transform ${
                  open ? '-translate-y-[7px] -rotate-45' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav
          id="mobile-nav"
          className="border-t border-line bg-surface px-6 pb-8 pt-4 lg:hidden"
          aria-label="Mobile"
        >
          {NAV.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block border-b border-line py-4 text-lg text-ink"
            >
              {t(key)}
            </Link>
          ))}
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-base font-medium text-white"
          >
            {t('contact')}
          </Link>
        </nav>
      )}
    </header>
  );
}
