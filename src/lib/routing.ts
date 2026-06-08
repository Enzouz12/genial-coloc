import { CAMPUS } from "../config";

/**
 * Calcul d'itinéraire réel jusqu'au campus via Navitia (données TCL/SYTRAL).
 * Les appels passent par le proxy Vite /navitia qui injecte le token.
 * En l'absence de token ou en cas d'erreur, on renvoie {} : l'app retombe
 * alors sur l'estimation par distance (voir geo.ts).
 */

const NAVITIA_JOURNEYS = "/navitia/v1/journeys";

export interface RouteTimes {
  /** Minutes en transport en commun, undefined si indisponible. */
  transitMin?: number;
  /** Minutes à vélo, undefined si indisponible. */
  bikeMin?: number;
}

/** Prochain matin de semaine à 08h00, figé pour comparer les offres entre elles. */
function referenceMorning(): string {
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  if (Date.now() >= d.getTime()) d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T080000`;
}

const MORNING = referenceMorning();

async function fetchJourneys(
  params: Array<[string, string]>
): Promise<unknown[] | null> {
  const url = new URL(NAVITIA_JOURNEYS, location.origin);
  for (const [k, v] of params) url.searchParams.append(k, v);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { journeys?: unknown[] };
    return data.journeys ?? null;
  } catch {
    return null;
  }
}

interface Section {
  type?: string;
}
interface Journey {
  duration?: number;
  sections?: Section[];
}

function toMin(seconds: number): number {
  return Math.round(seconds / 60);
}

/** Calcule les temps TCL et vélo d'un point jusqu'au campus. */
export async function routeToCampus(point: {
  lat: number;
  lng: number;
}): Promise<RouteTimes> {
  const from = `${point.lng};${point.lat}`;
  const to = `${CAMPUS.lng};${CAMPUS.lat}`;

  const [transit, bike] = await Promise.all([
    // Transport en commun à l'heure de pointe du matin.
    fetchJourneys([
      ["from", from],
      ["to", to],
      ["datetime", MORNING],
      ["datetime_represents", "departure"],
    ]),
    // Itinéraire vélo direct.
    fetchJourneys([
      ["from", from],
      ["to", to],
      ["direct_path", "only"],
      ["direct_path_mode[]", "bike"],
    ]),
  ]);

  const result: RouteTimes = {};

  if (transit) {
    const pt = (transit as Journey[]).filter((j) =>
      j.sections?.some((s) => s.type === "public_transport")
    );
    const best = Math.min(...pt.map((j) => j.duration ?? Infinity));
    if (Number.isFinite(best)) result.transitMin = toMin(best);
  }

  if (bike) {
    const best = (bike as Journey[])[0]?.duration;
    if (typeof best === "number") result.bikeMin = toMin(best);
  }

  return result;
}
