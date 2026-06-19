import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Section, ButtonLink, Eyebrow, NoObligationPill } from '@/components/ui';
import portrait from '../../../public/daley-brennan.jpg';
import vineyard from '../../../public/vineyard-vista.png';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://daleybrennan.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.home' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: { en: '/en', fr: '/fr', 'x-default': '/en' },
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <ProfessionalServiceJsonLd locale={locale} />
      <Hero />
      <Positioning />
      <Results />
      <Pillars />
      <DiagnosticTeaser />
      <SpeakingCallout />
      <Selective />
    </>
  );
}

function Hero() {
  const t = useTranslations('home.hero');
  return (
    <section className="relative isolate overflow-hidden bg-ink text-surface">
      <Image
        src={vineyard}
        alt=""
        aria-hidden="true"
        placeholder="blur"
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-ink/70 to-ink/30"
      />
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 md:px-10 md:pb-28 md:pt-32">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="reveal mt-6 max-w-4xl text-balance text-5xl leading-[1.05] md:text-7xl">
          {t('title')}
        </h1>
        <p className="reveal prose-measure mt-8 max-w-2xl text-lg text-muted-dark md:text-xl">
          {t('lede')}
        </p>
        <div className="reveal mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <ButtonLink href="/contact" variant="accent">
            {t('cta')}
          </ButtonLink>
          <a
            href="#diagnostic"
            className="text-sm text-muted-dark underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            {t('secondary')} →
          </a>
        </div>
      </div>
    </section>
  );
}

function Positioning() {
  const t = useTranslations('home.positioning');
  return (
    <Section tone="dark">
      <div className="grid items-center gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <div className="reveal order-2 md:order-1">
          <Image
            src={portrait}
            alt="Daley Brennan"
            placeholder="blur"
            sizes="(min-width: 768px) 40vw, 100vw"
            className="w-full max-w-sm rounded-lg border border-line-dark object-cover grayscale"
            priority={false}
          />
        </div>
        <div className="order-1 md:order-2">
          <h2 className="reveal text-balance text-3xl md:text-4xl">
            {t('title')}
          </h2>
          <p className="reveal mt-5 max-w-xl text-lg leading-relaxed text-muted-dark">
            {t('body')}
          </p>
        </div>
      </div>
    </Section>
  );
}

function Pillars() {
  const t = useTranslations('home.pillars');
  const keys = ['pricing', 'distribution', 'sequencing'] as const;
  return (
    <Section tone="light">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-14 grid overflow-hidden rounded-lg border-l border-t border-line md:grid-cols-3">
        {keys.map((k, i) => (
          <div key={k} className="reveal border-b border-r border-line bg-surface p-8 md:p-10">
            <span className="font-display text-3xl text-accent">
              0{i + 1}
            </span>
            <h3 className="mt-4 text-2xl">{t(`items.${k}.title`)}</h3>
            <p className="mt-3 text-muted">{t(`items.${k}.body`)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Results() {
  const t = useTranslations('home.results');
  const items = ['0', '1', '2', '3', '4'] as const;
  return (
    <Section tone="light">
      <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <div>
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="reveal mt-5 text-balance text-3xl md:text-4xl">
            {t('title')}
          </h2>
          <p className="reveal mt-6 max-w-xs text-sm text-muted">{t('note')}</p>
        </div>
        <ul className="space-y-5">
          {items.map((i) => (
            <li key={i} className="reveal flex gap-4 border-b border-line pb-5 last:border-b-0">
              <span
                className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                aria-hidden="true"
              />
              <span className="text-lg leading-relaxed text-ink-soft">
                {t(`items.${i}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function DiagnosticTeaser() {
  const t = useTranslations('home.diagnosticTeaser');
  return (
    <Section tone="panel" id="diagnostic">
      <div className="grid items-center gap-10 md:grid-cols-[1.3fr_1fr] md:gap-16">
        <div>
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="reveal mt-5 text-balance text-3xl md:text-4xl">
            {t('title')}
          </h2>
          <p className="reveal mt-5 max-w-xl text-lg text-muted">{t('body')}</p>
          <NoObligationPill />
        </div>
        <div className="reveal md:justify-self-end">
          <ButtonLink href="/export-strategy">{t('cta')}</ButtonLink>
        </div>
      </div>
    </Section>
  );
}

function SpeakingCallout() {
  const t = useTranslations('home.speakingCallout');
  return (
    <Section tone="light">
      <div className="grid items-center gap-10 md:grid-cols-[1.3fr_1fr] md:gap-16">
        <div>
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="reveal mt-5 text-balance text-3xl md:text-4xl">
            {t('title')}
          </h2>
          <p className="reveal mt-5 max-w-xl text-lg text-muted">{t('body')}</p>
        </div>
        <div className="reveal md:justify-self-end">
          <ButtonLink href="/speaking">{t('cta')}</ButtonLink>
        </div>
      </div>
    </Section>
  );
}

function Selective() {
  const t = useTranslations('home.selectiveBlock');
  return (
    <Section tone="dark">
      <div className="grid gap-8 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <h2 className="reveal text-3xl md:text-4xl">{t('title')}</h2>
        <p className="reveal max-w-xl self-center text-lg leading-relaxed text-muted-dark">
          {t('body')}
        </p>
      </div>
    </Section>
  );
}

async function ProfessionalServiceJsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'meta.home' });
  const json = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: t('name'),
    url: `${SITE_URL}/${locale}`,
    areaServed: ['United States', 'United Kingdom', 'United Arab Emirates', 'Northern Europe'],
    knowsLanguage: ['en', 'fr'],
    sameAs: ['https://www.linkedin.com/in/daley-b-91477670/'],
    founder: { '@type': 'Person', name: 'Daley Brennan' },
    serviceType: t.raw('serviceTypes'),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
