'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitch } from './LocaleSwitch';

const NAV = [
  { href: '/diagnostic', key: 'diagnostic' },
  { href: '/advisory', key: 'advisory' },
  { href: '/speaking', key: 'speaking' },
  { href: '/about', key: 'about' },
] as const;

export function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <Link
          href="/"
          className="font-display text-xl tracking-tight text-ink"
          onClick={() => setOpen(false)}
        >
          Daley Brennan
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {NAV.map(({ href, key }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative text-sm transition-colors hover:text-accent ${
                  active ? 'text-accent' : 'text-ink-soft'
                }`}
              >
                {t(key)}
              </Link>
            );
          })}
          <LocaleSwitch />
          <Link
            href="/contact"
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent"
          >
            {t('contact')}
          </Link>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-4 lg:hidden">
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
