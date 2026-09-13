import { formatTenge } from '../../lib/format';

export default function PriceBlock({ original, price, large }) {
  return (
    <div className={`price-block${large ? ' price-block--large' : ''}`}>
      <span className="price-block__now">{formatTenge(price)}</span>
      {original > price && (
        <span className="price-block__was">{formatTenge(original)}</span>
      )}
    </div>
  );
}
