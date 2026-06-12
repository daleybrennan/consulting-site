import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Section, CtaBand, Eyebrow, NoObligationPill } from '@/components/ui';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://daleybrennan.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.diagnostic' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/diagnostic`,
      languages: {
        en: '/en/diagnostic',
        fr: '/fr/diagnostic',
        'x-default': '/en/diagnostic',
      },
    },
  };
}

export default async function DiagnosticPage({
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
      <What />
      <How />
      <Cta />
    </>
  );
}

function Hero() {
  const t = useTranslations('diagnostic.hero');
  return (
    <Section tone="dark">
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <h1 className="reveal mt-6 max-w-4xl text-balance text-4xl leading-tight md:text-6xl">
        {t('title')}
      </h1>
      <p className="reveal prose-measure mt-8 text-lg text-muted-dark md:text-xl">
        {t('lede')}
      </p>
      <NoObligationPill tone="dark" />
    </Section>
  );
}

function What() {
  const t = useTranslations('diagnostic.what');
  const points = ['pricing', 'distribution', 'sequencing'] as const;
  return (
    <Section tone="light">
      <div className="grid gap-10 md:grid-cols-[1fr_1.3fr] md:gap-16">
        <h2 className="reveal text-3xl md:text-4xl">{t('title')}</h2>
        <div>
          <p className="reveal max-w-xl text-lg text-muted">{t('body')}</p>
          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p} className="reveal flex gap-4">
                <span className="mt-2 h-px w-6 shrink-0 bg-accent" aria-hidden="true" />
                <span className="text-ink-soft">{t(`points.${p}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

function How() {
  const t = useTranslations('diagnostic.how');
  const steps = ['one', 'two', 'three', 'four'] as const;
  return (
    <Section tone="panel">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <ol className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s} className="reveal bg-surface p-8 md:p-10">
            <span className="font-display text-3xl text-accent">0{i + 1}</span>
            <h3 className="mt-3 text-2xl">{t(`steps.${s}.title`)}</h3>
            <p className="mt-3 text-muted">{t(`steps.${s}.body`)}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Cta() {
  const t = useTranslations('diagnostic.cta');
  return <CtaBand title={t('title')} body={t('body')} button={t('button')} />;
}

function ServiceJsonLd({ locale }: { locale: string }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Commercial Diagnostic — US Market Readiness',
    serviceType: 'Commercial diagnostic for premium wine and spirits brands',
    url: `${SITE_URL}/${locale}/diagnostic`,
    provider: {
      '@type': 'Person',
      name: 'Daley Brennan',
      sameAs: ['https://www.linkedin.com/in/daley-b-91477670/'],
    },
    areaServed: 'United States',
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
