import { useRef, useState } from 'react';
import t from '../../i18n/ru';
import './PromoCarousel.css';

// Yandex-Go-style swipeable promo banners. Each slide is one big tap target
// that calls onSelect(sort) — the home list re-sorts + scrolls into view.
// Floating food + sparkles are decorative (aria-hidden); all motion is CSS and
// disabled under prefers-reduced-motion via motion.css.

const SPARKLES = [
  { top: '18%', right: '40%', size: 10, delay: '0s' },
  { top: '58%', right: '52%', size: 7, delay: '0.4s' },
  { top: '30%', right: '8%', size: 8, delay: '0.8s' },
];

function Sparkle({ style }) {
  return (
    <svg className="promo-slide__sparkle" style={style} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0c.7 5.6 2.4 10 9.6 12-7.2 2-8.9 6.4-9.6 12-.7-5.6-2.4-10-9.6-12 7.2-2 8.9-6.4 9.6-12Z" />
    </svg>
  );
}

export default function PromoCarousel({ onSelect }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const slides = t.promos;

  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== active) setActive(idx);
  }

  return (
    <div className="promo">
      <div className="promo__track" ref={trackRef} onScroll={handleScroll}>
        {slides.map((slide) => (
          <button
            key={slide.id}
            type="button"
            className={`promo-slide promo-slide--${slide.tone}`}
            onClick={() => onSelect?.(slide.sort)}
            aria-label={`${slide.title}. ${slide.sub}`}
          >
            <div className="promo-slide__text">
              <h2 className="promo-slide__title">
                {slide.title}
                <svg className="promo-slide__chevron" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </h2>
              <p className="promo-slide__sub">{slide.sub}</p>
              <span className="promo-slide__cta">{t.promoCta}</span>
            </div>

            <div className="promo-slide__art" aria-hidden="true">
              {SPARKLES.map((s, i) => (
                <Sparkle key={i} style={{ top: s.top, right: s.right, width: s.size, height: s.size, animationDelay: s.delay }} />
              ))}
              {slide.emojis.map((e, i) => (
                <span key={i} className={`promo-slide__food promo-slide__food--${i}`}>{e}</span>
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="promo__dots" aria-hidden="true">
        {slides.map((s, i) => (
          <span key={s.id} className={`promo__dot${i === active ? ' promo__dot--active' : ''}`} />
        ))}
      </div>
    </div>
  );
}
