import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

const LINKEDIN = 'https://www.linkedin.com/in/daley-b-91477670/';

export function Footer() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-surface">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.6fr_1fr_1fr] md:px-10">
        <div>
          <p className="font-display text-2xl">Daley Brennan</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-dark">
            {t('tagline')}
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.16em] text-accent-soft">
            {t('selective')}
          </p>
        </div>

        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.16em] text-muted-dark">
            {t('linksTitle')}
          </p>
          <ul className="space-y-3 text-sm">
            <li><Link href="/export-strategy" className="transition-colors hover:text-accent-soft">{nav('exportStrategy')}</Link></li>
            <li><Link href="/advisory" className="transition-colors hover:text-accent-soft">{nav('advisory')}</Link></li>
            <li><Link href="/distributor-finder" className="transition-colors hover:text-accent-soft">{nav('distributorFinder')}</Link></li>
            <li><Link href="/speaking" className="transition-colors hover:text-accent-soft">{nav('speaking')}</Link></li>
            <li><Link href="/about" className="transition-colors hover:text-accent-soft">{nav('about')}</Link></li>
            <li><Link href="/contact" className="transition-colors hover:text-accent-soft">{nav('contact')}</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.16em] text-muted-dark">
            {t('contactTitle')}
          </p>
          <a
            href={LINKEDIN}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm transition-colors hover:text-accent-soft"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
            </svg>
            {t('linkedin')}
          </a>
        </div>
      </div>

      <div className="border-t border-line-dark">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-dark md:px-10">
          © {year} Daley Brennan. {t('rights')}
        </div>
      </div>
    </footer>
  );
}
