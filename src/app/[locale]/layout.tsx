import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Newsreader, Geist } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { routing } from '@/i18n/routing';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import '../globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-newsreader',
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
});

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
  weight: ['300', '400', '500', '600'],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://daleybrennan.com';

export const viewport: Viewport = {
  themeColor: '#141414',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${t('home.title')} · ${t('siteName')}`,
      template: `%s · ${t('siteName')}`,
    },
    description: t('home.description'),
    alternates: {
      canonical: `/${locale}`,
      languages: { en: '/en', fr: '/fr', 'x-default': '/en' },
    },
    openGraph: {
      type: 'website',
      siteName: t('siteName'),
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      url: `${SITE_URL}/${locale}`,
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'nav' });

  return (
    <html lang={locale} className={`${newsreader.variable} ${geist.variable}`}>
      <body>
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-surface"
          >
            {t('skipToContent')}
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <Reveal />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
