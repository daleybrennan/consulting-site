import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import {
  Section,
  CtaBand,
  PageHero,
  NumberedGrid,
  Eyebrow,
  ButtonLink,
} from '@/components/ui';
import cellar from '../../../../../public/wine-cellar.jpg';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://daleybrennan.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.firstTime' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/export-strategy/first-time`,
      languages: {
        en: '/en/export-strategy/first-time',
        fr: '/fr/export-strategy/first-time',
        'x-default': '/en/export-strategy/first-time',
      },
    },
  };
}

export default async function FirstTimePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <FaqJsonLd locale={locale} />
      <Hero />
      <Questions />
      <Reality />
      <Start />
      <Faq />
      <Cta />
    </>
  );
}

function Hero() {
  const t = useTranslations('firstTime.hero');
  return (
    <PageHero
      image={cellar}
      objectPosition="50% 40%"
      eyebrow={t('eyebrow')}
      title={t('title')}
      lede={t('lede')}
    />
  );
}

const QUESTION_KEYS = ['readiness', 'market', 'size', 'price'] as const;

function Questions() {
  const t = useTranslations('firstTime.questions');
  const items = QUESTION_KEYS.map((k) => ({
    title: t(`items.${k}.title`),
    body: t(`items.${k}.body`),
  }));
  return (
    <Section tone="light">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-14">
        <NumberedGrid items={items} variant="sm" cols={2} />
      </div>
    </Section>
  );
}

function Reality() {
  const t = useTranslations('firstTime.reality');
  return (
    <Section tone="dark">
      <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <h2 className="reveal text-3xl md:text-4xl">{t('title')}</h2>
        <p className="reveal max-w-xl self-center text-lg leading-relaxed text-muted-dark">
          {t('body')}
        </p>
      </div>
    </Section>
  );
}

const START_KEYS = ['diagnostic', 'orientation'] as const;

function Start() {
  const t = useTranslations('firstTime.start');
  return (
    <Section tone="panel">
      <Eyebrow>{t('title')}</Eyebrow>
      <p className="reveal mt-5 max-w-2xl text-lg text-muted">{t('body')}</p>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {START_KEYS.map((k) => (
          <div
            key={k}
            className="reveal flex flex-col rounded-lg border border-line bg-surface p-8 md:p-10"
          >
            <h3 className="text-2xl">{t(`items.${k}.title`)}</h3>
            <p className="mt-3 flex-1 text-muted">{t(`items.${k}.body`)}</p>
          </div>
        ))}
      </div>
      <div className="reveal mt-10">
        <ButtonLink href="/contact">{t('cta')}</ButtonLink>
      </div>
    </Section>
  );
}

type FaqItem = { q: string; a: string };

function Faq() {
  const t = useTranslations('firstTime.faq');
  const items = t.raw('items') as FaqItem[];
  return (
    <Section tone="light">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-10 border-t border-line">
        {items.map((it, i) => (
          <details key={i} className="reveal group border-b border-line py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg text-ink [&::-webkit-details-marker]:hidden">
              <span>{it.q}</span>
              <span
                aria-hidden="true"
                className="shrink-0 text-2xl leading-none text-accent transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">{it.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function Cta() {
  const t = useTranslations('firstTime.cta');
  return <CtaBand title={t('title')} body={t('body')} button={t('button')} />;
}

async function FaqJsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'firstTime.faq' });
  const items = t.raw('items') as FaqItem[];
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
