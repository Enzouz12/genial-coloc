import { BUDGET, COMMUTE } from "../config";

/**
 * Couleur d'un marqueur selon le prix.
 * Vert vif (avantageux) → rouge (au plafond budget).
 */
export function priceColor(price: number): string {
  const { green, red } = BUDGET;
  return gradient(clamp((price - green) / (red - green), 0, 1));
}

/**
 * Couleur selon un temps de trajet en minutes, sur une échelle de paliers.
 * Vert (premier palier) → rouge (au-delà du dernier). Les paliers diffèrent
 * entre TCL et vélo, d'où le paramètre.
 */
export function timeColor(
  minutes: number,
  thresholds: readonly number[] = COMMUTE.thresholds
): string {
  const lo = thresholds[0];
  const hi = thresholds[thresholds.length - 1];
  return gradient(clamp((minutes - lo) / (hi - lo), 0, 1));
}

/** Interpolation de teinte vert (120°) → rouge (0°). */
function gradient(t: number): string {
  const hue = 120 * (1 - t);
  return `hsl(${hue}, 70%, 48%)`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
