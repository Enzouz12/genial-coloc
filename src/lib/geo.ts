import { CAMPUS } from "../config";

/** Distance à vol d'oiseau (km) entre deux points — formule de Haversine. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

/** Distance d'une offre jusqu'au campus (km, à vol d'oiseau). */
export function distanceToCampusKm(point: { lat: number; lng: number }): number {
  return haversineKm(point, CAMPUS);
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
