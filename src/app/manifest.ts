import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Daley Brennan — Commercial Strategy',
    short_name: 'Daley Brennan',
    description:
      'Commercial strategy for premium wine & spirits brands. US market entry, distribution, and pricing. Bilingual EN/FR.',
    start_url: '/',
    display: 'standalone',
    background_color: '#141414',
    theme_color: '#141414',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
