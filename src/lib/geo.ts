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

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

/**
 * Géocodage via la Base Adresse Nationale (api-adresse.data.gouv.fr).
 * Gratuit, sans clé, optimisé pour la France. Biaisé vers Lyon.
 */
export async function geocode(query: string): Promise<GeocodeResult | null> {
  const url = new URL("https://api-adresse.data.gouv.fr/search/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");
  // Biais géographique vers Lyon pour désambiguïser les quartiers.
  url.searchParams.set("lat", "45.7578");
  url.searchParams.set("lon", "4.8320");

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const [lng, lat] = feature.geometry.coordinates;
  return { lat, lng, label: feature.properties.label };
}
