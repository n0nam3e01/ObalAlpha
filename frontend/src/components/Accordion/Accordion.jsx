import { useCallback, useId, useState } from 'react';
import './Accordion.css';

// Bouncy, single-open accordion adapted to the FoodBox stack:
// plain JSX + plain CSS (tokens.css), CSS spring easing, no extra deps.
// Connected-list look: adjacent closed rows share one surface; the open row
// detaches with a small gap and full corner radius. All animation is CSS
// (grid-template-rows for height, --ease-spring for the bounce) so it respects
// prefers-reduced-motion globally via motion.css.

function useControllableValue({ value, defaultValue, onValueChange }) {
  const [internal, setInternal] = useState(defaultValue ?? null);
  const isControlled = value !== undefined;
  const current = value ?? internal;

  const setValue = useCallback(
    (next) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  return [current, setValue];
}

export default function Accordion({
  items,
  value,
  defaultValue = null,
  onValueChange,
  collapsible = true,
  className,
}) {
  const baseId = useId();
  const [activeValue, setActiveValue] = useControllableValue({ value, defaultValue, onValueChange });
  const activeIndex = items.findIndex((it) => it.id === activeValue);

  const toggleItem = useCallback(
    (id) => {
      if (activeValue === id) {
        if (collapsible) setActiveValue(null);
        return;
      }
      setActiveValue(id);
    },
    [activeValue, collapsible, setActiveValue],
  );

  return (
    <div className={`accordion${className ? ` ${className}` : ''}`}>
      {items.map((item, index) => {
        const open = activeValue === item.id;
        const previousIsOpen = activeIndex === index - 1;
        const nextIsOpen = activeIndex === index + 1;
        const startsGroup = open || index === 0 || previousIsOpen;
        const endsGroup = open || index === items.length - 1 || nextIsOpen;
        const separated = index > 0 && (open || previousIsOpen);
        const contentId = `${baseId}-${item.id}-content`;
        const triggerId = `${baseId}-${item.id}-trigger`;

        return (
          <div
            key={item.id}
            className="accordion__row"
            style={{ marginTop: separated ? 10 : 0 }}
          >
            <div
              data-state={open ? 'open' : 'closed'}
              className={[
                'accordion__item',
                !startsGroup && 'accordion__item--joined',
                item.disabled && 'accordion__item--disabled',
              ].filter(Boolean).join(' ')}
              style={{
                borderTopLeftRadius: startsGroup ? 'var(--radius-card)' : 0,
                borderTopRightRadius: startsGroup ? 'var(--radius-card)' : 0,
                borderBottomLeftRadius: endsGroup ? 'var(--radius-card)' : 0,
                borderBottomRightRadius: endsGroup ? 'var(--radius-card)' : 0,
              }}
            >
              <button
                id={triggerId}
                type="button"
                disabled={item.disabled}
                aria-expanded={open}
                aria-controls={item.description ? contentId : undefined}
                onClick={() => toggleItem(item.id)}
                className="accordion__trigger"
              >
                {item.icon ? <span className="accordion__icon">{item.icon}</span> : null}
                <span className="accordion__title">{item.title}</span>
                <span className="accordion__chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>

              {item.description ? (
                <div
                  id={contentId}
                  role="region"
                  aria-labelledby={triggerId}
                  aria-hidden={!open}
                  className="accordion__content"
                >
                  <div className="accordion__content-inner">
                    <div className="accordion__description">{item.description}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
