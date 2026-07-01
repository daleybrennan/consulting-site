'use client';

import { useEffect, useRef, useState } from 'react';
import Image, { type StaticImageData } from 'next/image';
import { Lightbox } from './Lightbox';

type ZoomImage = { src: StaticImageData; alt: string };
type Box = { left: number; top: number; width: number; height: number };

/**
 * Angled, layered product mockup for the Account Finder hero: the main app
 * screenshot sits in a browser frame with a slight 3D tilt, and the Settings
 * panel floats over its lower-left corner. Both drift gently (CSS `af-float`)
 * and parallax a touch on scroll, and either can be clicked to zoom full-size.
 * All motion is skipped under prefers-reduced-motion.
 */
export function AccountFinderMockup({
  app,
  settings,
  appAlt,
  settingsAlt,
  chromeLabel,
  expandLabel,
  closeLabel,
  dialogLabel,
}: {
  app: StaticImageData;
  settings: StaticImageData;
  appAlt: string;
  settingsAlt: string;
  chromeLabel: string;
  expandLabel: string;
  closeLabel: string;
  dialogLabel: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<{
    image: ZoomImage;
    sourceRect: Box;
  } | null>(null);

  const openZoom = (image: ZoomImage, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setActive({
      image,
      sourceRect: { left: r.left, top: r.top, width: r.width, height: r.height },
    });
  };
  // Signed viewport progress in ~[-1, 1] as the mockup crosses the viewport.
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const center = rect.top + rect.height / 2;
      // 0 when centred, negative once scrolled past, positive before.
      setProgress(Math.max(-1, Math.min(1, (center - vh / 2) / vh)));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const mainY = (progress * -16).toFixed(1);
  const settingsY = (progress * -34).toFixed(1);

  return (
    <div ref={rootRef} className="reveal relative mx-auto w-full max-w-xl md:mx-0">
      {/* Main app window */}
      <div
        className="af-float-slow"
        style={{ transform: `translate3d(0, ${mainY}px, 0)` }}
      >
        <div className="origin-center transition-transform duration-500 md:[transform:perspective(1600px)_rotateY(-9deg)_rotateX(3deg)]">
          <BrowserFrame label={chromeLabel}>
            <ZoomTrigger
              expandLabel={expandLabel}
              onOpen={(el) => openZoom({ src: app, alt: appAlt }, el)}
            >
              <Image
                src={app}
                alt={appAlt}
                placeholder="blur"
                sizes="(min-width: 768px) 42vw, 92vw"
                className="h-auto w-full"
                priority
              />
            </ZoomTrigger>
          </BrowserFrame>
        </div>
      </div>

      {/* Settings panel, floating over the lower-left corner */}
      <div
        className="af-float absolute -bottom-8 -left-4 w-[56%] sm:w-[52%] md:-bottom-10 md:-left-8 md:w-[50%]"
        style={{ transform: `translate3d(0, ${settingsY}px, 0)` }}
      >
        <div className="origin-center transition-transform duration-500 md:[transform:perspective(1600px)_rotateY(-6deg)_rotateX(2deg)]">
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-2xl shadow-black/50 ring-1 ring-white/10">
            <div className="flex items-center gap-2 border-b border-black/5 bg-[#f4f4f2] px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-accent/70" aria-hidden="true" />
              <span className="text-[0.6rem] font-medium uppercase tracking-[0.12em] text-ink-soft">
                Settings
              </span>
            </div>
            <ZoomTrigger
              expandLabel={expandLabel}
              onOpen={(el) => openZoom({ src: settings, alt: settingsAlt }, el)}
            >
              <Image
                src={settings}
                alt={settingsAlt}
                placeholder="blur"
                sizes="(min-width: 768px) 22vw, 50vw"
                className="h-auto w-full"
              />
            </ZoomTrigger>
          </div>
        </div>
      </div>

      {active && (
        <Lightbox
          image={active.image}
          sourceRect={active.sourceRect}
          dialogLabel={dialogLabel}
          closeLabel={closeLabel}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

/** Wraps an image so it can be clicked to zoom, with a hover expand cue. */
function ZoomTrigger({
  expandLabel,
  onOpen,
  children,
}: {
  expandLabel: string;
  onOpen: (el: HTMLElement) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={expandLabel}
      onClick={(e) => onOpen(e.currentTarget)}
      className="group relative block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {children}
      {/* faint darken on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-300 group-hover:bg-ink/[0.06]"
      />
      {/* expand badge */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-2.5 flex h-8 w-8 scale-90 items-center justify-center rounded-full bg-ink/70 text-white opacity-0 shadow-sm backdrop-blur-sm transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </span>
    </button>
  );
}

function BrowserFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl shadow-black/40 ring-1 ring-white/10">
      <div className="flex items-center gap-2 border-b border-black/5 bg-[#f4f4f2] px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e0605a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e8bd52]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#61c454]" />
        </span>
        <span className="ml-3 flex-1 truncate rounded-md bg-black/[0.04] px-3 py-1 text-center text-[0.7rem] text-muted">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
