import './SegmentedControl.css';

// segments: [{ key, label }], value = active key.
export default function SegmentedControl({ segments, value, onChange, size = 'md' }) {
  const activeIndex = Math.max(0, segments.findIndex((s) => s.key === value));

  return (
    <div
      className={`segmented segmented--${size}`}
      style={{ '--seg-count': segments.length, '--seg-index': activeIndex }}
    >
      <span className="segmented__thumb" />
      {segments.map((s) => (
        <button
          key={s.key}
          type="button"
          className={`segmented__seg${s.key === value ? ' segmented__seg--active' : ''}`}
          onClick={() => onChange(s.key)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
