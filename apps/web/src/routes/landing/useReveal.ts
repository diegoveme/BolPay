import { useEffect } from 'react';

/**
 * Drives the scroll entrance for every `.reveal` element inside the landing.
 * Re-triggers in BOTH directions: an element animates in when it enters the
 * viewport and resets when it leaves, so the animation replays each time you
 * scroll past it (down or back up), ROG-style. Respects prefers-reduced-motion
 * (handled in CSS). Toggling a class is cheap; the transition runs on the GPU.
 */
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.bp-landing .reveal'));
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('in', entry.isIntersecting);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -12% 0px' },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
