export default function Rating({ value, onChange, readOnly }) {
  return (
    <div className={`rating${readOnly ? ' rating--readonly' : ''}`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={`rating__star${s <= (value ?? 0) ? ' rating__star--filled' : ''}`}
          onClick={!readOnly ? () => onChange?.(s) : undefined}
        >
          ★
        </span>
      ))}
    </div>
  );
}
