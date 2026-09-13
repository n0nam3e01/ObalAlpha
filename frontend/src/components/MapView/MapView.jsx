import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import PriceBlock from '../PriceBlock/PriceBlock';
import t from '../../i18n';
import './MapView.css';

const ASTANA_CENTER = [51.128, 71.4304];

const CATEGORY_EMOJI = {
  BAKERY: '🥐', PREPARED: '🍱', SUPERMARKET: '🛒',
  CAFE: '☕', DESSERT: '🍰', OTHER: '🍽️',
};

// Static Astana food-venue spots — always rendered as dim background markers so
// the map never looks empty regardless of the active category filter.
// First 8 mirror the seed venues exactly; the rest add plausible density.
const ASTANA_SPOTS = [
  { id: 's1',  name: 'Тёплый Багет',      category: 'BAKERY',      lat: 51.0902, lng: 71.4180 },
  { id: 's2',  name: 'Хлеб & Зёрна',      category: 'BAKERY',      lat: 51.1690, lng: 71.4070 },
  { id: 's3',  name: 'Кофе Лес',          category: 'CAFE',        lat: 51.0951, lng: 71.4270 },
  { id: 's4',  name: 'Утро Кофейня',      category: 'CAFE',        lat: 51.1810, lng: 71.4455 },
  { id: 's5',  name: 'Дала Кухня',        category: 'PREPARED',    lat: 51.1785, lng: 71.4395 },
  { id: 's6',  name: 'Казан Обед',        category: 'PREPARED',    lat: 51.1665, lng: 71.4030 },
  { id: 's7',  name: 'Сити Маркет',       category: 'SUPERMARKET', lat: 51.1640, lng: 71.4100 },
  { id: 's8',  name: 'Сахар & Ваниль',   category: 'DESSERT',     lat: 51.0940, lng: 71.4150 },
  { id: 's9',  name: 'Кофейня Центр',     category: 'CAFE',        lat: 51.1100, lng: 71.4350 },
  { id: 's10', name: 'Пекарня на Туране', category: 'BAKERY',      lat: 51.1300, lng: 71.4220 },
  { id: 's11', name: 'City Coffee',       category: 'CAFE',        lat: 51.1450, lng: 71.4550 },
  { id: 's12', name: 'Десертная лавка',   category: 'DESSERT',     lat: 51.1220, lng: 71.4000 },
  { id: 's13', name: 'Готовая еда №1',    category: 'PREPARED',    lat: 51.0980, lng: 71.4600 },
  { id: 's14', name: 'Маркет Плюс',       category: 'SUPERMARKET', lat: 51.1580, lng: 71.4300 },
  { id: 's15', name: 'Булочная Алматы',   category: 'BAKERY',      lat: 51.1750, lng: 71.4500 },
  { id: 's16', name: 'Café Nur',          category: 'CAFE',        lat: 51.1050, lng: 71.4480 },
  { id: 's17', name: 'Пирожковая',        category: 'BAKERY',      lat: 51.1380, lng: 71.3950 },
  { id: 's18', name: 'Суши & Лапша',     category: 'PREPARED',    lat: 51.1530, lng: 71.4650 },
  { id: 's19', name: 'Кондитерская',      category: 'DESSERT',     lat: 51.1170, lng: 71.4120 },
  { id: 's20', name: 'Свежий хлеб',       category: 'BAKERY',      lat: 51.0870, lng: 71.4320 },
];

const TILES = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CARTO',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CARTO',
  },
};

function useThemeName() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setTheme(el.dataset.theme || 'light'));
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

function activeIcon(emoji, isSelected) {
  return L.divIcon({
    className: 'map-marker-wrap',
    html: `<div class="map-marker${isSelected ? ' map-marker--active' : ''}"><span>${emoji}</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
}

function dimIcon(emoji) {
  return L.divIcon({
    className: 'map-marker-wrap',
    html: `<div class="map-marker map-marker--dim"><span>${emoji}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

// Recenters map whenever the active set of points changes.
// Called with invalidateSize first so a fresh-mounted map gets the right size.
function MapController({ points }) {
  const map = useMap();

  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(id);
  }, [map]);

  useEffect(() => {
    const id = setTimeout(() => {
      map.invalidateSize();
      if (points.length === 1) {
        map.setView(points[0], 14);
      } else if (points.length > 1) {
        map.fitBounds(points, { padding: [60, 60], maxZoom: 15 });
      }
    }, 80);
    return () => clearTimeout(id);
  }, [points, map]);

  return null;
}

export default function MapView({ boxes, loading }) {
  const navigate = useNavigate();
  const theme = useThemeName();
  const [selectedId, setSelectedId] = useState(null);

  // Group filtered boxes by venue (one marker per venue, cheapest box).
  const venues = useMemo(() => {
    const m = new Map();
    for (const b of boxes) {
      const v = b.venue;
      if (!v || v.geo_lat == null || v.geo_lng == null) continue;
      const cur = m.get(v.id);
      if (!cur) m.set(v.id, { venue: v, cheapest: b, count: 1 });
      else {
        cur.count += 1;
        if (b.price < cur.cheapest.price) cur.cheapest = b;
      }
    }
    return [...m.values()];
  }, [boxes]);

  // lat/lng pairs of active (filtered) venues — used for fitBounds.
  const activePoints = useMemo(
    () => venues.map((x) => [x.venue.geo_lat, x.venue.geo_lng]),
    [venues],
  );

  // When no active venue matches the selection, close the card.
  useEffect(() => {
    if (selectedId && !venues.some((x) => x.venue.id === selectedId)) {
      setSelectedId(null);
    }
  }, [venues, selectedId]);

  const tiles = TILES[theme] ?? TILES.light;
  const selected = venues.find((x) => x.venue.id === selectedId) ?? null;

  // Active lat/lng set — skip rendering a static spot at the same position.
  const activeKeys = new Set(venues.map((x) => `${x.venue.geo_lat}_${x.venue.geo_lng}`));

  // fitBounds: use active venues when available, else show all static spots.
  const fitPoints =
    activePoints.length > 0
      ? activePoints
      : ASTANA_SPOTS.map((s) => [s.lat, s.lng]);

  return (
    <div className="map-view">
      <MapContainer
        center={ASTANA_CENTER}
        zoom={12}
        className="map-view__canvas"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer key={theme} url={tiles.url} attribution={tiles.attribution} />
        <MapController points={fitPoints} />

        {/* ── Static background spots: always visible, non-interactive ── */}
        {ASTANA_SPOTS.map((spot) => {
          // Don't overlay a dim marker where an active one already sits.
          if (activeKeys.has(`${spot.lat}_${spot.lng}`)) return null;
          return (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              icon={dimIcon(CATEGORY_EMOJI[spot.category] ?? '🍽️')}
            />
          );
        })}

        {/* ── Active markers: from the filtered API response, clickable ── */}
        {venues.map(({ venue, cheapest }) => (
          <Marker
            key={venue.id}
            position={[venue.geo_lat, venue.geo_lng]}
            icon={activeIcon(CATEGORY_EMOJI[venue.category] ?? '🍽️', venue.id === selectedId)}
            eventHandlers={{ click: () => setSelectedId(venue.id) }}
          />
        ))}
      </MapContainer>

      {selected && (
        <div className="map-card" role="dialog" aria-label={selected.venue.name}>
          <button
            className="map-card__close"
            onClick={() => setSelectedId(null)}
            aria-label={t.cancelNo}
          >
            ✕
          </button>
          <p className="map-card__venue">{selected.venue.name}</p>
          <p className="map-card__title">{selected.cheapest.title}</p>
          <div className="map-card__row">
            <PriceBlock
              original={selected.cheapest.original_price}
              price={selected.cheapest.price}
            />
            <button
              className="map-card__btn"
              onClick={() => navigate(`/box/${selected.cheapest.id}`)}
            >
              {t.pickup}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
