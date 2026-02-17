const R = 6371; // Earth radius in km

export function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pointToSegmentDistance(point, segStart, segEnd) {
  const { lat: pLat, lng: pLng } = point;
  const { lat: aLat, lng: aLng } = segStart;
  const { lat: bLat, lng: bLng } = segEnd;

  const dx = bLat - aLat;
  const dy = bLng - aLng;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return haversine(pLat, pLng, aLat, aLng);

  let t = ((pLat - aLat) * dx + (pLng - aLng) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projLat = aLat + t * dx;
  const projLng = aLng + t * dy;

  return haversine(pLat, pLng, projLat, projLng);
}

export function findItemsNearRoute(items, routeCoords, radiusKm = 20) {
  if (!routeCoords || routeCoords.length === 0) return [];

  const results = [];

  for (const item of items) {
    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);
    if (isNaN(lat) || isNaN(lng)) continue;
    if (item.tier === "excluded") continue;

    let minDist = Infinity;
    const point = { lat, lng };

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const dist = pointToSegmentDistance(point, routeCoords[i], routeCoords[i + 1]);
      if (dist < minDist) minDist = dist;
    }

    // Also check distance to each waypoint directly
    for (const coord of routeCoords) {
      const dist = haversine(lat, lng, coord.lat, coord.lng);
      if (dist < minDist) minDist = dist;
    }

    if (minDist <= radiusKm) {
      results.push({ ...item, _distance: minDist });
    }
  }

  return results.sort((a, b) => a._distance - b._distance);
}
