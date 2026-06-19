import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

type Tone = 'dark' | 'light' | 'panel';

const TONE: Record<Tone, string> = {
  dark: 'bg-ink text-surface',
  light: 'bg-surface text-ink',
  panel: 'bg-surface-2 text-ink',
};

/** Photo that sits grayscale and eases to full colour on hover — a restrained
 *  way to add warmth without breaking the monochrome system. */
export const PHOTO_REVEAL =
  'grayscale transition-[filter] duration-700 ease-out hover:grayscale-0 motion-reduce:transition-none';

export function Section({
  tone = 'light',
  children,
  className = '',
  id,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={TONE[tone]}>
      <div
        className={`mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28 ${className}`}
      >
        {children}
      </div>
    </section>
  );
}

export function ButtonLink({
  href,
  children,
  variant = 'solid',
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'solid' | 'outline-light' | 'accent';
}) {
  const styles = {
    solid: 'bg-ink text-white hover:bg-accent',
    'outline-light':
      'border border-white/35 text-white hover:border-white hover:bg-white/10',
    accent: 'bg-accent text-white hover:bg-accent-soft',
  }[variant];

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-colors ${styles}`}
    >
      <span className="text-inherit">{children}</span>
      <span aria-hidden="true" className="text-inherit">→</span>
    </Link>
  );
}

export function CtaBand({
  tone = 'dark',
  title,
  body,
  button,
  href = '/contact',
}: {
  tone?: Tone;
  title: string;
  body: string;
  button: string;
  href?: string;
}) {
  return (
    <Section tone={tone} className="text-center">
      <h2 className="reveal mx-auto max-w-2xl text-balance text-4xl md:text-5xl">
        {title}
      </h2>
      <p
        className={`reveal mx-auto mt-5 max-w-xl ${
          tone === 'dark' ? 'text-muted-dark' : 'text-muted'
        }`}
      >
        {body}
      </p>
      <div className="reveal mt-9">
        <ButtonLink href={href} variant={tone === 'dark' ? 'accent' : 'solid'}>
          {button}
        </ButtonLink>
      </div>
    </Section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow reveal">{children}</p>;
}

/** Small "Without obligation" pill — tone-aware for light or dark sections. */
export function NoObligationPill({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const t = useTranslations('common');
  const cls =
    tone === 'dark'
      ? 'border-white/25 text-muted-dark'
      : 'border-line text-ink-soft';
  return (
    <span
      className={`reveal mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.12em] ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
      {t('noObligation')}
    </span>
  );
}
