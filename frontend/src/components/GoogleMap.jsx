import { useState } from 'react';

export default function GoogleMap({ boxes, compact = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const venues = [...new Map(boxes.map((box) => [box.venue.id, box.venue])).values()];
  const selected = venues.find((venue) => venue.id === selectedId) || venues[0];
  const query = encodeURIComponent(selected ? `${selected.geo_lat},${selected.geo_lng}` : '51.1283,71.4305');
  return <section className={`map-panel${compact ? ' map-panel--pickup' : ''}`} aria-label={compact ? 'Место самовывоза' : 'Карта заведений Астаны'}>
    <iframe title={selected ? `${selected.name} на Google Maps` : 'Астана на Google Maps'} src={`https://www.google.com/maps?q=${query}&z=${selected ? 16 : 12}&output=embed&hl=ru`} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"/>
    <div className="map-results"><strong>{compact ? 'Где забрать заказ' : 'Заведения с предложениями'}</strong>
      {!selected && <p>Пока нет предложений. Здесь будут показаны заведения Астаны.</p>}
      {compact && selected ? <p>{selected.name}<br/>{selected.address}</p> :
      <div className="map-results__list">{venues.map((venue) => <button key={venue.id} type="button" className={venue.id === selected.id ? 'active' : ''} onClick={() => setSelectedId(venue.id)} aria-pressed={venue.id === selected.id}>
        <strong>{venue.name}</strong><span>{venue.address}</span>
      </button>)}</div>}
      {selected && <a href={`https://www.google.com/maps/dir/?api=1&destination=${query}`} target="_blank" rel="noreferrer">Построить маршрут в Google Maps ↗</a>}
    </div>
  </section>;
}
