import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Section, CtaBand, Eyebrow } from '@/components/ui';
import portrait from '../../../../public/daley-brennan.jpg';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://daleybrennan.com';
const LINKEDIN = 'https://www.linkedin.com/in/daley-b-91477670/';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.about' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/about`,
      languages: {
        en: '/en/about',
        fr: '/fr/about',
        'x-default': '/en/about',
      },
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <PersonJsonLd locale={locale} />
      <Hero />
      <Body />
      <Skills />
      <Cta />
    </>
  );
}

function Hero() {
  const t = useTranslations('about.hero');
  return (
    <Section tone="dark">
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <h1 className="reveal mt-6 max-w-4xl text-balance text-4xl leading-tight md:text-6xl">
        {t('title')}
      </h1>
      <p className="reveal prose-measure mt-8 text-lg text-muted-dark md:text-xl">
        {t('lede')}
      </p>
    </Section>
  );
}

function Body() {
  const t = useTranslations('about.body');
  return (
    <Section tone="light">
      <div className="grid gap-12 md:grid-cols-[0.7fr_1.3fr] md:gap-16">
        <div className="reveal">
          <Image
            src={portrait}
            alt="Daley Brennan"
            placeholder="blur"
            sizes="(min-width: 768px) 33vw, 100vw"
            className="w-full max-w-xs rounded-lg border border-line object-cover grayscale md:sticky md:top-28"
          />
        </div>
        <div>
          <div className="space-y-6 text-lg leading-relaxed text-ink-soft">
            <p className="reveal">{t('p1')}</p>
            <p className="reveal">{t('p2')}</p>
            <p className="reveal">{t('p3')}</p>
          </div>
          <div className="reveal mt-10">
        <p className="text-sm text-muted">{t('linkedin')}</p>
        <a
          href={LINKEDIN}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-accent underline-offset-4 transition-colors hover:text-accent-soft hover:underline"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
          </svg>
          {t('linkedinCta')} →
        </a>
          </div>
        </div>
      </div>
    </Section>
  );
}

function Skills() {
  const t = useTranslations('about.skills');
  const items = Array.from({ length: 8 }, (_, i) => t(`items.${i}`));
  return (
    <Section tone="panel">
      <h2 className="reveal text-3xl md:text-4xl">{t('title')}</h2>
      <ul className="mt-10 grid overflow-hidden rounded-lg border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li
            key={item}
            className="reveal border-b border-r border-line bg-surface px-6 py-7 text-sm leading-snug text-ink-soft"
          >
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Cta() {
  const t = useTranslations('about.cta');
  return <CtaBand title={t('title')} body={t('body')} button={t('button')} />;
}

function PersonJsonLd({ locale }: { locale: string }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Daley Brennan',
    jobTitle: 'Commercial strategist, premium wine & spirits',
    url: `${SITE_URL}/${locale}/about`,
    sameAs: [LINKEDIN],
    knowsLanguage: ['en', 'fr'],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'New York',
      addressCountry: 'US',
    },
    knowsAbout: [
      'US market access',
      'Wine distribution strategy',
      'Pricing architecture',
      'Channel strategy',
      'Premium positioning',
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
