// Modèle de données central de Génial Coloc.

/** Un contact lié à une annonce (proprio, agence, locataire actuel…). */
export interface OfferContact {
  id: string;
  /** Rôle ou source libre : « Proprio », « Agence Foncia », « Locataire actuel »… */
  label?: string;
  name?: string;
  phone?: string;
  email?: string;
}

/** Un lien associé à une annonce (site, annonce secondaire, plan…). */
export interface OfferLink {
  id: string;
  label?: string;
  url: string;
}

/** Un média (image ou vidéo) attaché à une annonce. Stocké dans un bucket
 *  privé Supabase ; seul le chemin est conservé (URL signée à la demande). */
export interface OfferMedia {
  id: string;
  /** Chemin du fichier dans le bucket. */
  path: string;
  type: "image" | "video";
  name?: string;
  /** Pour une vidéo découpée : même valeur sur toutes les parties. */
  groupId?: string;
  /** Index 1-based de la partie. */
  part?: number;
  /** Nombre total de parties du groupe. */
  parts?: number;
}

/** Avis nominatif d'un colocataire sur une annonce (un seul par auteur). */
export interface OfferReview {
  author: string;
  /** Note de 0 à 10. */
  score: number;
  comment?: string;
  updatedAt: number;
}

/** Notes structurées d'une annonce (contacts, liens, visite, médias, avis). */
export interface OfferDetails {
  /** Date/heure de visite, texte libre (ex. « mar. 1 juil. · 18h30 »). */
  visitDate?: string;
  contacts?: OfferContact[];
  links?: OfferLink[];
  media?: OfferMedia[];
  reviews?: OfferReview[];
}

/** Statut de suivi d'une offre pendant la recherche. */
export type OfferStatus =
  | "new"
  | "to_call"
  | "pending"
  | "reviewing"
  | "to_visit"
  | "visited"
  | "favorite"
  | "rejected";

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
  /** Temps de trajet TCL jusqu'au campus, en minutes (matin de semaine). */
  transitMin?: number;
  /** Temps de trajet à vélo jusqu'au campus, en minutes. */
  bikeMin?: number;
  /** Statut de suivi (à visiter, favori, écartée…). */
  status?: OfferStatus;
  /** Qui a ajouté l'offre (toi / ton·ta coloc). */
  addedBy?: string;
  /** Colocataires ayant validé leur intérêt (handshake). */
  interestedBy?: string[];
  /** Notes libres (étage, meublé, dispo...). */
  notes?: string;
  /** Notes structurées (contacts, liens, date de visite). */
  details?: OfferDetails;
  createdAt: number;
}

/** Données saisies dans le formulaire avant résolution des coordonnées. */
export type OfferDraft = Omit<Offer, "id" | "lat" | "lng" | "createdAt">;
