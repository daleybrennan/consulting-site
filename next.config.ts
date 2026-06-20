import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Chromium binary for PDF rendering must not be bundled by the server build.
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'puppeteer'],
  // Next.js output-file tracing can't follow chromium.executablePath() (a runtime
  // string), so the binary directory is excluded from the Lambda by default.
  // Explicitly include it for the two routes that call htmlToPdf().
  outputFileTracingIncludes: {
    '/api/leads/submit': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/admin/reports/[id]/regenerate': ['./node_modules/@sparticuz/chromium/bin/**'],
  },
  // The diagnostic + audit pages merged into /export-strategy.
  async redirects() {
    return [
      {
        source: '/:locale(en|fr)/diagnostic',
        destination: '/:locale/export-strategy',
        permanent: true,
      },
      {
        source: '/:locale(en|fr)/audit',
        destination: '/:locale/export-strategy',
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
