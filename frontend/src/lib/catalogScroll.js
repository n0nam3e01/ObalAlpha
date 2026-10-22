const positions = new Map();
export function rememberScroll(url, top) {
  positions.delete(url); positions.set(url, top);
  if (positions.size > 40) positions.delete(positions.keys().next().value);
}
export function savedScroll(url) { return positions.get(url) || 0; }
