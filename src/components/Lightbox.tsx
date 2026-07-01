'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import Image, { type StaticImageData } from 'next/image';

type Box = { left: number; top: number; width: number; height: number };

/**
 * Premium click-to-zoom overlay. The image grows (FLIP) from the thumbnail's
 * on-screen position to a centred full-size view over a blurred backdrop, and
 * shrinks back on close. Animates transform only; honours reduced motion.
 */
export function Lightbox({
  image,
  sourceRect,
  dialogLabel,
  closeLabel,
  onClose,
}: {
  image: { src: StaticImageData; alt: string };
  sourceRect: Box;
  dialogLabel: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const figureRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // With reduced motion there is nothing to grow, so start "entered".
  const [entered, setEntered] = useState(reduce);
  const [target] = useState<Box>(() =>
    computeTarget(image.src.width, image.src.height)
  );

  // Grow in from the source rect on first paint (before the browser paints, so
  // the full-size frame is never shown flat first).
  useLayoutEffect(() => {
    const el = figureRef.current;
    if (!el || reduce) return;
    el.style.transition = 'none';
    el.style.transform = flipTransform(target, sourceRect);
    // force reflow so the starting transform is committed
    void el.offsetWidth;
    const id = requestAnimationFrame(() => {
      el.style.transition = 'transform 440ms cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = 'none';
      setEntered(true);
    });
    return () => cancelAnimationFrame(id);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setEntered(false);
    const el = figureRef.current;
    if (reduce || !el) {
      window.setTimeout(onClose, 180);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onClose();
    };
    el.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 1, 1)';
    el.style.transform = flipTransform(target, sourceRect);
    el.addEventListener('transitionend', finish, { once: true });
    window.setTimeout(finish, 360);
  }, [reduce, target, sourceRect, onClose]);

  // Escape to close, minimal focus trap, body scroll lock, focus restore.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab') {
        // Only the close button is focusable — keep focus on it.
        e.preventDefault();
        closeBtnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [close]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      onClick={close}
      className="fixed inset-0 z-50"
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-ink/85 backdrop-blur-md transition-opacity duration-300 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <button
        ref={closeBtnRef}
        type="button"
        aria-label={closeLabel}
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
        className={`absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div
        ref={figureRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: target.left,
          top: target.top,
          width: target.width,
          height: target.height,
          transformOrigin: 'top left',
          opacity: reduce && !entered ? 0 : 1,
          transition: reduce ? 'opacity 200ms ease' : undefined,
        }}
        className="overflow-hidden rounded-xl shadow-2xl shadow-black/60 ring-1 ring-white/15"
      >
        <Image
          src={image.src}
          alt={image.alt}
          placeholder="blur"
          sizes="92vw"
          fill
          className="object-contain"
        />
      </div>
    </div>,
    document.body
  );
}

/** Largest centred box that fits the image in the viewport without upscaling. */
function computeTarget(natW: number, natH: number): Box {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min((vw * 0.92) / natW, (vh * 0.88) / natH, 1);
  const width = Math.round(natW * scale);
  const height = Math.round(natH * scale);
  return {
    width,
    height,
    left: Math.round((vw - width) / 2),
    top: Math.round((vh - height) / 2),
  };
}

/** Transform that maps the centred target box back onto the source rect. */
function flipTransform(target: Box, source: Box): string {
  const dx = source.left - target.left;
  const dy = source.top - target.top;
  const scale = target.width ? source.width / target.width : 1;
  return `translate(${dx}px, ${dy}px) scale(${scale})`;
}
