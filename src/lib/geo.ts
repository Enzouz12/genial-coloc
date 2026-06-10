import { CAMPUS, COMMUTE, LYON_CENTER } from "../config";

/** Rayon maximal accepté autour de Lyon pour un résultat de géocodage (km). */
const LYON_MAX_RADIUS_KM = 30;

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

/** Temps de trajet estimé jusqu'au campus, en minutes. */
export function estimatedCommuteMinutes(point: { lat: number; lng: number }): number {
  const km = distanceToCampusKm(point) * COMMUTE.detourFactor;
  return (km / COMMUTE.averageSpeedKmh) * 60;
}

export interface CommuteBucket {
  /** Estimation brute en minutes. */
  minutes: number;
  /** Palier atteint (15/30/45/60), ou 0 au-delà du dernier palier. */
  threshold: number;
  /** Libellé court, ex. "~ 30 min", "~ 1 h", "> 1 h". */
  label: string;
}

/** Range une durée en minutes dans le palier de 15 min le plus proche. */
export function bucketFromMinutes(minutes: number): CommuteBucket {
  const { thresholds } = COMMUTE;
  const last = thresholds[thresholds.length - 1];
  const nearest = thresholds.find((t) => minutes <= t + 7.5);

  if (nearest === undefined) {
    return { minutes, threshold: 0, label: `> ${formatMinutes(last)}` };
  }
  return { minutes, threshold: nearest, label: `~ ${formatMinutes(nearest)}` };
}

/**
 * Palier de trajet d'une offre. Utilise le temps TCL réel s'il a été calculé,
 * sinon l'estimation par distance.
 */
export function commuteBucket(offer: {
  lat: number;
  lng: number;
  transitMin?: number;
}): CommuteBucket {
  const minutes = offer.transitMin ?? estimatedCommuteMinutes(offer);
  return bucketFromMinutes(minutes);
}

function formatMinutes(m: number): string {
  return m >= 60 ? `${m / 60} h` : `${m} min`;
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
  url.searchParams.set("limit", "5");
  // Biais géographique vers Lyon pour désambiguïser les quartiers.
  url.searchParams.set("lat", String(LYON_CENTER.lat));
  url.searchParams.set("lon", String(LYON_CENTER.lng));

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();

  // On retient le premier résultat situé dans l'agglomération lyonnaise.
  // Le biais ci-dessus ne fait que reclasser, il ne filtre pas : sans ce
  // garde-fou, "Écully centre" peut renvoyer une commune homonyme lointaine.
  for (const feature of data.features ?? []) {
    const [lng, lat] = feature.geometry.coordinates;
    if (haversineKm({ lat, lng }, LYON_CENTER) <= LYON_MAX_RADIUS_KM) {
      return { lat, lng, label: feature.properties.label };
    }
  }
  return null;
}

/**
 * Géocodage inverse : adresse la plus proche d'un point cliqué sur la carte.
 * Via la BAN (gratuit, sans clé), comme le géocodage direct.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodeResult | null> {
  const url = new URL("https://api-adresse.data.gouv.fr/reverse/");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const [flng, flat] = feature.geometry.coordinates;
  return { lat: flat, lng: flng, label: feature.properties.label };
}
