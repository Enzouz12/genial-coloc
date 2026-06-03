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

/** Noms des colocataires (pour le champ "ajouté par"). */
export const ROOMMATES = ["Enzo", "Coloc"] as const;
