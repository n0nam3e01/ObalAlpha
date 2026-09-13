export default function QtyBadge({ qty }) {
  const urgent = qty <= 2;
  return (
    <span className={`qty-badge${urgent ? ' qty-badge--urgent' : ''}`}>
      осталось {qty}
    </span>
  );
}
