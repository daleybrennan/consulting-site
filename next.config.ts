import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Chromium binary for PDF rendering must not be bundled by the server build.
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'puppeteer'],
};

export default withNextIntl(nextConfig);
