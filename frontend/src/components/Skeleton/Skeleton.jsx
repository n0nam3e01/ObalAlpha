export default function Skeleton({ width, height, radius, className = '' }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? '16px',
        borderRadius: radius ?? '8px',
      }}
    />
  );
}

// Mirrors BoxCard's exact layout (160px hero, same body rhythm) so swapping the
// skeleton for the real card causes zero layout shift.
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton height="160px" radius="var(--radius-card) var(--radius-card) 0 0" />
      <div className="skeleton-card__body">
        <Skeleton height="12px" width="40%" />
        <Skeleton height="18px" width="75%" />
        <Skeleton height="12px" width="55%" />
        <div className="skeleton-card__footer">
          <Skeleton height="20px" width="35%" />
          <Skeleton height="20px" width="28%" radius="var(--radius-pill)" />
        </div>
      </div>
    </div>
  );
}
