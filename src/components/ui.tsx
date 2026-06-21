import { useTranslations } from 'next-intl';
import Image, { type StaticImageData } from 'next/image';
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
    solid: 'bg-ink text-white shadow-sm hover:bg-accent hover:shadow-md',
    'outline-light':
      'border border-white/35 text-white hover:border-white hover:bg-white/10',
    accent:
      'bg-accent text-white shadow-sm shadow-accent/20 hover:bg-accent-soft hover:shadow-md hover:shadow-accent/30',
  }[variant];

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-[background-color,box-shadow] ${styles}`}
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

/** Full-bleed page hero: blurred cover image, gradient depth, accent base rule.
 *  Used on every marketing page so the treatment stays consistent in one place. */
export function PageHero({
  image,
  objectPosition,
  imageClassName = '',
  eyebrow,
  title,
  lede,
  size = 'lg',
  children,
}: {
  image: StaticImageData;
  objectPosition?: string;
  imageClassName?: string;
  eyebrow: string;
  title: React.ReactNode;
  lede: string;
  size?: 'xl' | 'lg';
  children?: React.ReactNode;
}) {
  const titleSize =
    size === 'xl'
      ? 'text-5xl leading-[1.05] md:text-7xl'
      : 'text-4xl leading-tight md:text-6xl';
  return (
    <section className="relative isolate overflow-hidden border-b-2 border-accent/40 bg-ink text-surface">
      <Image
        src={image}
        alt=""
        aria-hidden="true"
        placeholder="blur"
        priority
        sizes="100vw"
        style={objectPosition ? { objectPosition } : undefined}
        className={`absolute inset-0 -z-20 h-full w-full object-cover ${imageClassName}`}
      />
      {/* horizontal scrim for text legibility + bottom vignette for depth */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-ink/70 to-ink/30"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-ink/80 to-transparent"
      />
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 md:px-10 md:pb-28 md:pt-32">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className={`reveal mt-6 max-w-4xl text-balance ${titleSize}`}>
          {title}
        </h1>
        <p className="reveal prose-measure mt-8 max-w-2xl text-lg text-muted-dark md:text-xl">
          {lede}
        </p>
        {children}
      </div>
    </section>
  );
}

/** Thin dark proof band of value/label pairs. Sits directly under a PageHero. */
export function ProofBar({
  items,
}: {
  items: { value: string; label: string }[];
}) {
  return (
    <section className="border-b border-line-dark bg-ink text-surface">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-6 md:grid-cols-4 md:px-10">
        {items.map((it, i) => (
          <div
            key={i}
            className="reveal relative px-2 py-7 text-center md:px-4 md:py-9"
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 hidden h-10 w-px -translate-y-1/2 bg-line-dark md:block"
              />
            )}
            <dt className="font-display text-2xl text-accent-on-dark md:text-3xl">
              {it.value}
            </dt>
            <dd className="mt-1.5 text-xs uppercase tracking-[0.14em] text-muted-dark">
              {it.label}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Bordered grid of numbered cards with a restrained hover lift.
 *  Replaces the four near-identical numbered grids across the site. */
export function NumberedGrid({
  items,
  variant = 'lg',
  cols = 3,
  ordered = false,
}: {
  items: { title: string; body: string }[];
  variant?: 'lg' | 'sm';
  cols?: 2 | 3;
  ordered?: boolean;
}) {
  const colClass =
    cols === 2 ? 'md:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';
  const numCls = variant === 'lg' ? 'text-3xl' : 'text-2xl';
  const titleCls = variant === 'lg' ? 'mt-4 text-2xl' : 'mt-3 text-xl';
  const bodyCls =
    variant === 'lg' ? 'mt-3 text-muted' : 'mt-2 text-sm leading-relaxed text-muted';
  const pad = variant === 'lg' ? 'p-8 md:p-10' : 'p-8 md:p-9';
  const Wrapper = ordered ? 'ol' : 'div';
  const Cell = ordered ? 'li' : 'div';
  return (
    <Wrapper
      className={`grid overflow-hidden rounded-lg border-l border-t border-line ${colClass}`}
    >
      {items.map((it, i) => (
        <Cell
          key={i}
          className={`reveal card-hover border-b border-r border-line bg-surface ${pad}`}
        >
          <span className={`font-display text-accent ${numCls}`}>0{i + 1}</span>
          <h3 className={titleCls}>{it.title}</h3>
          <p className={bodyCls}>{it.body}</p>
        </Cell>
      ))}
    </Wrapper>
  );
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
