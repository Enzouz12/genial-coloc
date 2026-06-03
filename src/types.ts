// Modèle de données central de Génial Colloc.

export interface Offer {
  id: string;
  /** Lien vers l'annonce d'origine (SeLoger pour l'instant). */
  url: string;
  /** Titre court de l'annonce. */
  title: string;
  /** Loyer mensuel charges comprises, en euros. */
  price: number;
  /** Surface en m² (optionnel). */
  surface?: number;
  /** Nombre de pièces (optionnel). */
  rooms?: number;
  /** Quartier ou adresse saisie, utilisé pour le géocodage. */
  location: string;
  /** Coordonnées résolues via la Base Adresse Nationale. */
  lat: number;
  lng: number;
  /** Qui a ajouté l'offre (toi / ton·ta coloc). */
  addedBy?: string;
  /** Notes libres (étage, meublé, dispo...). */
  notes?: string;
  createdAt: number;
}

/** Données saisies dans le formulaire avant résolution des coordonnées. */
export type OfferDraft = Omit<Offer, "id" | "lat" | "lng" | "createdAt">;
