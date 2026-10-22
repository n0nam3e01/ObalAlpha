export function selectOffers(boxes, filters = {}, now = new Date()) {
  const day = new Date(now.getTime() + 5 * 3600000).toISOString().slice(0, 10);
  const query = (filters.q || '').trim().toLowerCase();
  const max = filters.max !== '' && filters.max != null ? Number(filters.max) : null;
  const rows = boxes.filter((box) => {
    const date = String(box.pickup_date).slice(0, 10);
    const start = new Date(`${date}T${box.pickup_start}:00+05:00`);
    const end = new Date(`${date}T${box.pickup_end}:00+05:00`);
    return date === day && box.status === 'ACTIVE' && box.qty_left > 0 && start < end && end > now
      && (!filters.category || filters.category === 'ALL' || box.venue.category === filters.category)
      && (!filters.district || box.venue.district === filters.district)
      && (!filters.venue || String(box.venue.id) === filters.venue)
      && (!Number.isFinite(max) || max === null || box.price <= max)
      && (filters.now !== '1' || start <= now)
      && `${box.title} ${box.description || ''} ${box.items || ''} ${box.venue.name}`.toLowerCase().includes(query);
  });
  const distance = (box) => Number.isFinite(box.distance_km) ? box.distance_km : Infinity;
  return rows.sort((a, b) => (filters.sort === 'cheapest' ? a.price - b.price
    : filters.sort === 'nearby' ? distance(a) - distance(b)
    : a.pickup_end.localeCompare(b.pickup_end)) || a.id - b.id);
}
