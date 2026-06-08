// Constantes métier de Génial Colloc.

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
 * Estimation du temps de trajet jusqu'au campus à partir de la distance
 * à vol d'oiseau, puis classement par paliers.
 */
export const COMMUTE = {
  /** Vitesse effective moyenne en km/h appliquée à la distance estimée. */
  averageSpeedKmh: 14,
  /** Facteur de détour : le trajet réel est plus long que la ligne droite. */
  detourFactor: 1.35,
  /** Paliers de temps de trajet, en minutes. */
  thresholds: [15, 30, 45, 60],
} as const;

/** Noms des colocataires (pour le champ "ajouté par"). */
export const ROOMMATES = ["Enzo", "Coloc"] as const;
