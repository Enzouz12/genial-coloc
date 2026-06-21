// Identité locale du colocataire « moi ».
//
// L'app n'a pas d'authentification : pour le handshake d'intérêt, chaque
// navigateur retient qui l'utilise (Enzo ou Esteban) dans localStorage.

import { ROOMMATES } from "../config";

const KEY = "genial-coloc.me";

/** Colocataire actif sur ce navigateur (défaut : le premier de la liste). */
export function getMe(): string {
  const v = localStorage.getItem(KEY);
  return v && (ROOMMATES as readonly string[]).includes(v) ? v : ROOMMATES[0];
}

/** Mémorise le colocataire actif pour les prochaines sessions. */
export function setMe(name: string): void {
  localStorage.setItem(KEY, name);
}
