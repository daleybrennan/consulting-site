import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Section,
  ButtonLink,
  Eyebrow,
  PageHero,
  ProofBar,
  NumberedGrid,
} from '@/components/ui';
import { RotatingHeadline } from '@/components/RotatingHeadline';
import { Link } from '@/i18n/navigation';
import portrait from '../../../public/daley-brennan.jpg';
import vineyard from '../../../public/vineyard-vista.png';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://daleybrennan.com';
const LINKEDIN = 'https://www.linkedin.com/in/daley-b-91477670/';

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
      <Proof />
      <WhoFor />
      <Pillars />
      <Positioning />
      <Results />
      <DiagnosticTeaser />
      <SpeakingCallout />
      <Selective />
    </>
  );
}

function Hero() {
  const t = useTranslations('home.hero');
  const titles = t.raw('titles') as string[];
  return (
    <PageHero
      image={vineyard}
      size="xl"
      eyebrow={t('eyebrow')}
      title={<RotatingHeadline titles={titles} />}
      lede={t('lede')}
    >
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
      <p className="reveal mt-6 max-w-xl text-sm text-muted-dark">{t('note')}</p>
    </PageHero>
  );
}

function Proof() {
  const t = useTranslations('home.proof');
  const items = ['0', '1', '2', '3'].map((i) => ({
    value: t(`items.${i}.value`),
    label: t(`items.${i}.label`),
  }));
  return <ProofBar items={items} />;
}

function WhoFor() {
  const t = useTranslations('home.whoFor');
  const keys = ['0', '1', '2', '3'] as const;
  return (
    <Section tone="light">
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <h2 className="reveal mt-5 max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {keys.map((k) => (
          <div
            key={k}
            className="reveal card-hover rounded-lg border border-line bg-surface p-8"
          >
            <span
              className="block h-1.5 w-1.5 rounded-full bg-accent"
              aria-hidden="true"
            />
            <h3 className="mt-5 text-xl">{t(`items.${k}.title`)}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {t(`items.${k}.body`)}
            </p>
          </div>
        ))}
      </div>
      <Link
        href="/export-strategy/first-time"
        className="reveal mt-8 inline-flex items-center gap-2 text-sm text-accent underline-offset-4 transition-colors hover:text-accent-soft hover:underline"
      >
        {t('firstTimeLink')} →
      </Link>
    </Section>
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
  const items = keys.map((k) => ({
    title: t(`items.${k}.title`),
    body: t(`items.${k}.body`),
  }));
  return (
    <Section tone="panel">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-14">
        <NumberedGrid items={items} variant="lg" cols={3} />
      </div>
    </Section>
  );
}

function Results() {
  const t = useTranslations('home.results');
  const items = ['0', '1', '2', '3', '4', '5'] as const;
  return (
    <Section tone="light">
      <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <div>
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="reveal mt-5 text-balance text-3xl md:text-4xl">
            {t('title')}
          </h2>
          <p className="reveal mt-6 max-w-xs text-sm text-muted">{t('note')}</p>
          <p className="reveal mt-6 max-w-xs text-sm text-muted">{t('verify')}</p>
          <a
            href={LINKEDIN}
            target="_blank"
            rel="noopener noreferrer"
            className="reveal mt-3 inline-flex items-center gap-2 text-sm text-accent underline-offset-4 transition-colors hover:text-accent-soft hover:underline"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
            </svg>
            {t('verifyCta')} →
          </a>
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
