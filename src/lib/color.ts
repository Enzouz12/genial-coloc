import { BUDGET } from "../config";

/**
 * Couleur d'un marqueur selon le prix.
 * Vert vif (avantageux) → rouge (au plafond budget).
 * Interpolation de teinte HSL de 120° (vert) à 0° (rouge).
 */
export function priceColor(price: number): string {
  const { green, red } = BUDGET;
  const t = clamp((price - green) / (red - green), 0, 1);
  const hue = 120 * (1 - t); // 120 → 0
  return `hsl(${hue}, 75%, 45%)`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
