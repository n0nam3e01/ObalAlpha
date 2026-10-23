import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Keep native scrolling: no wheel interception, artificial scroll distances or pins.
export function useHomeScroll(scope, offersKey) {
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add({
      desktop: '(min-width: 768px)',
      mobile: '(max-width: 767px)',
      reduced: '(prefers-reduced-motion: reduce)',
    }, ({ conditions }) => {
      if (conditions.reduced) return;
      const hero = scope.current.querySelector('.hero-copy, .catalog-intro');
      const mediaElement = scope.current.querySelector('.hero-media, .catalog-art');
      if (conditions.desktop && hero && mediaElement) {
        gsap.fromTo(mediaElement, { y: -24 }, {
          y: 24, ease: 'none',
          scrollTrigger: {
            trigger: hero, start: 'clamp(top bottom)', end: 'bottom top',
            scrub: 0.7, invalidateOnRefresh: true,
          },
        });
      }
      scope.current.querySelectorAll('[data-scroll-reveal]').forEach((element) => {
        gsap.from(element, {
          y: conditions.desktop ? 22 : 12, opacity: 0.45,
          duration: 0.55, ease: 'power2.out', clearProps: 'transform,opacity',
          scrollTrigger: { trigger: element, start: 'top 94%', once: true },
        });
      });
    }, scope);
    // A changing preference or leaving Home restores the original, visible styles.
    return () => media.revert();
  }, { scope });

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      scope.current.querySelectorAll('.offer-reveal').forEach((element) => {
        // Wrappers own entrance motion; the card retains its hover/press transform.
        gsap.from(element, {
          y: 18, opacity: 0.45, duration: 0.5, ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: element, start: 'top 96%', once: true },
        });
      });
    }, scope);
    ScrollTrigger.refresh();
    return () => media.revert();
  }, { scope, dependencies: [offersKey], revertOnUpdate: true });
}
