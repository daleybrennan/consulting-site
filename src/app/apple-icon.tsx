import { ImageResponse } from 'next/og';

// Apple touch icon (Add to Home Screen). Solid ink background — Apple icons
// must not be transparent — with the burgundy monogram.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#141414',
          color: '#d98aa0',
          fontSize: 96,
          fontWeight: 500,
          fontFamily: 'serif',
          letterSpacing: -2,
        }}
      >
        DB
      </div>
    ),
    { ...size }
  );
}
