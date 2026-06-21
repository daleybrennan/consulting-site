import { ImageResponse } from 'next/og';

// Branded social-share card. Rendered by Satori (next/og) with the built-in
// font — deliberately no external font fetch, so the build can never break on
// a network call. Inherits the [locale] route param for a localised tagline.
export const alt = 'Daley Brennan: Commercial strategy for premium wine & spirits';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#141414';
const SURFACE = '#f7f7f5';
const ACCENT = '#d98aa0'; // lightened burgundy, legible on ink
const MUTED = '#b8b6b2';

const COPY: Record<string, { eyebrow: string; name: string; tagline: string }> = {
  en: {
    eyebrow: 'Premium wine & spirits · commercial strategy',
    name: 'Daley Brennan',
    tagline: 'US market entry, distribution & pricing for premium wine and spirits brands.',
  },
  fr: {
    eyebrow: 'Vins & spiritueux premium · stratégie commerciale',
    name: 'Daley Brennan',
    tagline: 'Entrée sur le marché américain, distribution et prix pour les marques de vins & spiritueux premium.',
  },
};

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = COPY[locale] ?? COPY.en;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: INK,
          color: SURFACE,
          padding: '80px 90px',
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: ACCENT,
            fontWeight: 500,
          }}
        >
          {c.eyebrow}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 90, height: 4, background: ACCENT, marginBottom: 36 }} />
          <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -2, lineHeight: 1 }}>
            {c.name}
          </div>
          <div style={{ fontSize: 38, color: MUTED, marginTop: 32, maxWidth: 900, lineHeight: 1.3 }}>
            {c.tagline}
          </div>
        </div>

        <div style={{ fontSize: 24, color: MUTED, letterSpacing: 1 }}>
          daleybrennan.com · Bilingual EN / FR
        </div>
      </div>
    ),
    { ...size }
  );
}
