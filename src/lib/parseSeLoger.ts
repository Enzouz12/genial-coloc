import type { OfferDraft } from "../types";

/**
 * Stratégie B (semi-manuelle) : on pré-remplit ce qu'on peut deviner depuis
 * l'URL ou un texte collé, l'utilisateur complète le reste.
 *
 * NB : SeLoger est protégé par DataDome et ne peut pas être scrapé côté
 * navigateur. On se contente donc d'heuristiques sur le texte fourni.
 */
export function parsePasted(input: string): Partial<OfferDraft> {
  const draft: Partial<OfferDraft> = {};

  const url = input.match(/https?:\/\/[^\s]+/)?.[0];
  if (url) draft.url = url;

  // Prix : "1 050 €", "950€", "1050 euros"
  const price = input.match(/(\d[\d\s.]{2,6})\s*(?:€|eur)/i);
  if (price) {
    const n = parseInt(price[1].replace(/[\s.]/g, ""), 10);
    if (!Number.isNaN(n)) draft.price = n;
  }

  // Surface : "42 m²", "42m2"
  const surface = input.match(/(\d{1,3})\s*m(?:²|2)/i);
  if (surface) draft.surface = parseInt(surface[1], 10);

  // Pièces : "T3", "3 pièces", "3 pieces"
  const rooms =
    input.match(/T\s?(\d)/i) ?? input.match(/(\d)\s*pi[eè]ces?/i);
  if (rooms) draft.rooms = parseInt(rooms[1], 10);

  return draft;
}
