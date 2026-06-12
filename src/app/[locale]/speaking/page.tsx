import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Section, CtaBand, Eyebrow } from '@/components/ui';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://daleybrennan.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.speaking' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/speaking`,
      languages: {
        en: '/en/speaking',
        fr: '/fr/speaking',
        'x-default': '/en/speaking',
      },
    },
  };
}

export default async function SpeakingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <ServiceJsonLd locale={locale} />
      <Hero />
      <Education />
      <Formats />
      <Academic />
      <Cta />
    </>
  );
}

function Hero() {
  const t = useTranslations('speaking.hero');
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

function Education() {
  const t = useTranslations('speaking.education');
  const points = ['0', '1', '2', '3'] as const;
  return (
    <Section tone="light">
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <h2 className="reveal mt-5 max-w-3xl text-balance text-3xl md:text-4xl">
        {t('title')}
      </h2>
      <p className="reveal prose-measure mt-6 text-lg text-muted">{t('body')}</p>
      <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
        {points.map((p) => (
          <div key={p} className="reveal bg-paper p-8">
            <h3 className="text-xl">{t(`points.${p}.title`)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t(`points.${p}.body`)}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Formats() {
  const t = useTranslations('speaking.formats');
  const items = ['0', '1', '2', '3'] as const;
  return (
    <Section tone="panel">
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <h2 className="reveal mt-5 text-3xl md:text-4xl">{t('title')}</h2>
      <p className="reveal mt-5 max-w-xl text-lg text-muted">{t('body')}</p>
      <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i} className="reveal bg-surface p-7">
            <h3 className="text-lg">{t(`items.${i}.title`)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t(`items.${i}.body`)}
            </p>
          </div>
        ))}
      </div>
      <p className="reveal mt-8 inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink-soft">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        {t('languages')}
      </p>
    </Section>
  );
}

function Academic() {
  const t = useTranslations('speaking.academic');
  const creds = ['0', '1', '2'] as const;
  return (
    <Section tone="light">
      <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
        <div>
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="reveal mt-5 text-balance text-3xl md:text-4xl">
            {t('title')}
          </h2>
        </div>
        <div>
          <p className="reveal text-lg leading-relaxed text-muted">{t('body')}</p>
          <ul className="mt-8 space-y-3">
            {creds.map((c) => (
              <li key={c} className="reveal flex gap-3 text-ink-soft">
                <span
                  className="mt-2 h-px w-6 shrink-0 bg-accent"
                  aria-hidden="true"
                />
                <span>{t(`credentials.${c}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

function Cta() {
  const t = useTranslations('speaking.cta');
  return <CtaBand title={t('title')} body={t('body')} button={t('button')} />;
}

function ServiceJsonLd({ locale }: { locale: string }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Speaking & Education — Cross-Cultural Commercial Strategy',
    serviceType:
      'Seminars, keynotes, and cultural-adaptation education for wine & spirits',
    url: `${SITE_URL}/${locale}/speaking`,
    provider: {
      '@type': 'Person',
      name: 'Daley Brennan',
      sameAs: ['https://www.linkedin.com/in/daley-b-91477670/'],
      alumniOf: [
        { '@type': 'CollegeOrUniversity', name: 'University College London' },
        { '@type': 'CollegeOrUniversity', name: 'École Normale Supérieure' },
      ],
    },
    availableLanguage: ['en', 'fr'],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
