// Renders an HTML string to a PDF Buffer with headless Chromium.
// Local dev uses full `puppeteer` (bundled Chromium); production/Vercel uses
// `puppeteer-core` + `@sparticuz/chromium`. Types are loosened because the two
// libraries expose subtly different (and incompatible) launch/option unions.
/* eslint-disable @typescript-eslint/no-explicit-any */

export async function htmlToPdf(html: string): Promise<Buffer> {
  const isProd =
    process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

  let browser: any;

  if (isProd) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    const puppeteer = (await import('puppeteer')).default;
    browser = await puppeteer.launch({ headless: true });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const data: Uint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    return Buffer.from(data);
  } finally {
    await browser.close();
  }
}
