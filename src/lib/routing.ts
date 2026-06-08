import { CAMPUS } from "../config";

/**
 * Calcul d'itinéraire réel jusqu'au campus via Transitous (moteur MOTIS),
 * qui agrège les GTFS officiels dont le réseau TCL.
 * Service gratuit, sans clé : appel direct depuis le navigateur.
 * En cas d'erreur, on renvoie {} : l'app retombe sur l'estimation par
 * distance (voir geo.ts).
 */

const MOTIS_PLAN = "https://api.transitous.org/api/v1/plan";

export interface RouteTimes {
  /** Minutes en transport en commun, undefined si indisponible. */
  transitMin?: number;
  /** Minutes à vélo, undefined si indisponible. */
  bikeMin?: number;
}

/** Prochain matin de semaine à 08h00 locale, figé pour comparer les offres. */
function referenceMorning(): string {
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  if (Date.now() >= d.getTime()) d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

const MORNING = referenceMorning();

interface Itinerary {
  duration?: number;
}
interface PlanResponse {
  itineraries?: Itinerary[];
  direct?: Itinerary[];
}

function toMin(seconds: number): number {
  return Math.round(seconds / 60);
}

async function plan(
  params: Record<string, string>
): Promise<PlanResponse | null> {
  const url = new URL(MOTIS_PLAN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as PlanResponse;
  } catch {
    return null;
  }
}

/** Calcule les temps TCL et vélo d'un point jusqu'au campus. */
export async function routeToCampus(point: {
  lat: number;
  lng: number;
}): Promise<RouteTimes> {
  // MOTIS attend les coordonnées en lat,lon.
  const from = `${point.lat},${point.lng}`;
  const to = `${CAMPUS.lat},${CAMPUS.lng}`;

  // Deux appels : transport en commun (itineraries) et vélo direct (direct).
  // directModes=BIKE supprime les itinéraires TC, d'où la séparation.
  const [transitData, bikeData] = await Promise.all([
    plan({ fromPlace: from, toPlace: to, time: MORNING }),
    plan({ fromPlace: from, toPlace: to, time: MORNING, directModes: "BIKE" }),
  ]);

  const result: RouteTimes = {};

  const transit = transitData?.itineraries ?? [];
  const best = Math.min(...transit.map((j) => j.duration ?? Infinity));
  if (Number.isFinite(best)) result.transitMin = toMin(best);

  const bike = bikeData?.direct?.[0]?.duration;
  if (typeof bike === "number") result.bikeMin = toMin(bike);

  return result;
}
