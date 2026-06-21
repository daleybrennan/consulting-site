'use client';

import { useEffect, useState } from 'react';

/** Shows a headline from the pool, picking a different one at random on each
 *  visit. Renders titles[0] on first paint (SSR + initial hydration match, so
 *  the LCP heading has text immediately), then swaps to a random pick once
 *  mounted. Plain text swap, no animation. */
export function RotatingHeadline({ titles }: { titles: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (titles.length <= 1) return;
    // Defer to the next frame so the pick happens after the first paint,
    // off the effect's synchronous path.
    const id = requestAnimationFrame(() =>
      setIndex(Math.floor(Math.random() * titles.length)),
    );
    return () => cancelAnimationFrame(id);
  }, [titles.length]);

  return <>{titles[index] ?? titles[0]}</>;
}
