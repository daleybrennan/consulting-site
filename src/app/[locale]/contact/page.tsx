import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Eyebrow, NoObligationPill } from '@/components/ui';
import { ApplicationForm } from '@/components/ApplicationForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.contact' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/contact`,
      languages: {
        en: '/en/contact',
        fr: '/fr/contact',
        'x-default': '/en/contact',
      },
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Hero />
      <FormSection />
    </>
  );
}

function Hero() {
  const t = useTranslations('contact.hero');
  return (
    <section className="bg-ink text-surface">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-20 md:px-10 md:pb-20 md:pt-28">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="reveal mt-6 max-w-3xl text-balance text-4xl leading-tight md:text-6xl">
          {t('title')}
        </h1>
        <p className="reveal prose-measure mt-6 text-lg text-muted-dark">
          {t('lede')}
        </p>
        <NoObligationPill tone="dark" />
      </div>
    </section>
  );
}

function FormSection() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
        <ApplicationForm />
      </div>
    </section>
  );
}
