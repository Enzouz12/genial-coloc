// Constantes métier de Génial Colloc.
import type { OfferStatus } from "./types";

/** Point de référence : Université Lyon 2 — Campus Porte des Alpes (Bron). */
export const CAMPUS = {
  name: "Lyon 2 — Campus Porte des Alpes",
  lat: 45.7309,
  lng: 4.8794,
} as const;

/** Centre de carte par défaut (Lyon). */
export const LYON_CENTER = { lat: 45.764, lng: 4.8357 } as const;

/**
 * Bornes de budget pour le dégradé de couleur.
 * En dessous de GREEN → vert vif (très avantageux).
 * Au-dessus de RED → rouge (au plafond / trop cher).
 */
export const BUDGET = {
  green: 700,
  red: 1100,
} as const;

/**
 * Bornes du prix au m² (loyer / surface) pour la vue qualité-prix.
 * Vert = avantageux, rouge = cher au m². Calé sur le marché lyonnais.
 */
export const VALUE = {
  green: 8,
  red: 18,
} as const;

/**
 * Estimation du temps de trajet jusqu'au campus à partir de la distance
 * à vol d'oiseau, puis classement par paliers.
 */
export const COMMUTE = {
  /** Vitesse effective moyenne en km/h appliquée à la distance estimée. */
  averageSpeedKmh: 14,
  /** Facteur de détour : le trajet réel est plus long que la ligne droite. */
  detourFactor: 1.35,
  /** Paliers de temps de trajet TCL, en minutes. */
  thresholds: [15, 30, 45, 60],
  /** Paliers de temps de trajet à vélo, en minutes (trajets plus courts). */
  bikeThresholds: [10, 20, 30, 40],
} as const;

/** Noms des colocataires (pour le champ "ajouté par"). */
export const ROOMMATES = ["Enzo", "Esteban"] as const;

/** Statuts de suivi d'une offre, avec libellé et couleur. */
export const STATUSES: { id: OfferStatus; label: string; color: string }[] = [
  { id: "new", label: "Nouvelle", color: "#9aa0aa" },
  { id: "to_visit", label: "À visiter", color: "#3b82f6" },
  { id: "visited", label: "Visitée", color: "#a855f7" },
  { id: "favorite", label: "Favori", color: "#22c55e" },
  { id: "rejected", label: "Écartée", color: "#ef4444" },
];

/** Couleur d'un statut (gris par défaut). */
export function statusColor(status: OfferStatus | undefined): string {
  return STATUSES.find((s) => s.id === (status ?? "new"))?.color ?? "#9aa0aa";
}
