/**
 * Distance & Geolocation helpers for 86Job
 */

/**
 * Calculates straight-line distance in kilometers between two GPS coordinates using the Haversine formula.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.round(dist * 10) / 10;
}

/**
 * Formats distance into human readable string
 */
export function formatDistance(distanceKm: number): string {
  if (!distanceKm || distanceKm <= 0) return 'Gần bạn';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`;
}

/**
 * Naver Map Directions URL
 */
export interface RouteInfo {
  coordinates: [number, number][]; // [lat, lng] array
  durationSeconds: number;
  distanceMeters: number;
  midpoint: [number, number]; // [lat, lng]
}

/**
 * Generates realistic street-like grid turns between start and end coordinates
 */
export function generateStreetGridRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): [number, number][] {
  const points: [number, number][] = [];
  points.push([startLat, startLng]);

  const dLat = endLat - startLat;
  const dLng = endLng - startLng;

  // Build a 6-turn street grid simulation
  const p1: [number, number] = [startLat + dLat * 0.15, startLng];
  const p2: [number, number] = [startLat + dLat * 0.15, startLng + dLng * 0.45];
  const p3: [number, number] = [startLat + dLat * 0.65, startLng + dLng * 0.45];
  const p4: [number, number] = [startLat + dLat * 0.65, startLng + dLng * 0.9];
  const p5: [number, number] = [endLat, startLng + dLng * 0.9];

  points.push(p1, p2, p3, p4, p5, [endLat, endLng]);
  return points;
}

/**
 * Fetches turn-by-turn route path between user location and job destination via OSRM.
 */
export async function fetchWalkingRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteInfo> {
  const distKm = calculateDistanceKm(startLat, startLng, endLat, endLng);
  const durationSeconds = Math.max(120, Math.round((distKm / 4.5) * 3600)); // ~4.5 km/h walking speed

  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    
    // Add 1.5s timeout so the map renders instantly without hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates.map(
          (pt: [number, number]) => [pt[1], pt[0]]
        );
        const midIndex = Math.floor(coords.length / 2);
        const midpoint = coords[midIndex] || [(startLat + endLat) / 2, (startLng + endLng) / 2];
        return {
          coordinates: coords,
          durationSeconds: route.duration,
          distanceMeters: route.distance,
          midpoint
        };
      }
    }
  } catch (err) {
    console.warn('OSRM routing fetch skipped or timed out, using street grid polyline:', err);
  }

  // Fallback: Multi-turn street grid polyline
  const gridCoords = generateStreetGridRoute(startLat, startLng, endLat, endLng);
  const midIndex = Math.floor(gridCoords.length / 2);
  const midpoint = gridCoords[midIndex];

  return {
    coordinates: gridCoords,
    durationSeconds,
    distanceMeters: distKm * 1000,
    midpoint
  };
}

export function getNaverMapDirectionUrl(
  jobLat: number,
  jobLng: number,
  jobTitle: string,
  userLat?: number,
  userLng?: number
): string {
  if (userLat && userLng) {
    return `https://map.naver.com/v5/directions/${userLat},${userLng},${encodeURIComponent(
      'Vị trí của tôi'
    )}/${jobLat},${jobLng},${encodeURIComponent(jobTitle)}/-/transit`;
  }
  return `https://map.naver.com/v5/search/${encodeURIComponent(jobTitle)}/place/${jobLat},${jobLng}`;
}

/**
 * Kakao Map Directions URL
 */
export function getKakaoMapDirectionUrl(
  jobLat: number,
  jobLng: number,
  jobTitle: string,
  userLat?: number,
  userLng?: number
): string {
  if (userLat && userLng) {
    return `https://map.kakao.com/link/from/${encodeURIComponent(
      'Vị trí của tôi'
    )},${userLat},${userLng}/to/${encodeURIComponent(jobTitle)},${jobLat},${jobLng}`;
  }
  return `https://map.kakao.com/link/to/${encodeURIComponent(jobTitle)},${jobLat},${jobLng}`;
}

/**
 * Google Maps Directions URL
 */
export function getGoogleMapDirectionUrl(
  jobLat: number,
  jobLng: number,
  jobTitle: string,
  userLat?: number,
  userLng?: number
): string {
  if (userLat && userLng) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${jobLat},${jobLng}&travelmode=transit`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${jobLat},${jobLng}`;
}
