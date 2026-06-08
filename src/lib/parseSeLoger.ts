import type { OfferDraft } from "../types";

/**
 * Stratégie B (semi-manuelle) : on pré-remplit ce qu'on peut deviner depuis
 * l'URL ou un texte collé, l'utilisateur complète le reste.
 *
 * NB : SeLoger est protégé par DataDome et ne peut pas être scrapé côté
 * navigateur. Le loyer et la surface ne figurent pas dans l'URL : seuls la
 * ville, le quartier et le type s'y trouvent. Le reste vient du texte collé
 * ou de la saisie manuelle.
 */
export function parsePasted(input: string): Partial<OfferDraft> {
  const draft: Partial<OfferDraft> = {};

  const url = input.match(/https?:\/\/[^\s]+/)?.[0];
  if (url) {
    draft.url = url;
    Object.assign(draft, parseSeLogerUrl(url));
  }

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

/**
 * Extrait ville, quartier et type depuis une URL d'annonce SeLoger.
 * Format attendu : /annonces/{categorie}/{type}/{ville-dpt}/{quartier?}/{id}.htm
 */
function parseSeLogerUrl(raw: string): Partial<OfferDraft> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return {};
  }
  if (!/(^|\.)seloger\.com$/i.test(u.hostname)) return {};

  const parts = u.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("annonces");
  if (idx === -1 || parts.length < idx + 4) return {};

  const type = humanizeWords(parts[idx + 2]);
  const city = humanizeCity(parts[idx + 3]);
  const afterCity = parts.slice(idx + 4);
  const neighborhood =
    afterCity.length >= 2 ? humanizeWords(afterCity[0]) : undefined;

  if (!city) return {};

  const draft: Partial<OfferDraft> = {
    // La ville (ou arrondissement) est fiable à géocoder : c'est la zone.
    location: city,
    title: neighborhood ? `${type} ${city} — ${neighborhood}` : `${type} ${city}`,
  };
  return draft;
}

/** "les-charmilles-sud" → "Les Charmilles Sud". */
function humanizeWords(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** "lyon-7eme-69" → "Lyon 7e" ; "bron-69" → "Bron". */
function humanizeCity(slug: string): string {
  const tokens = slug.split("-").filter(Boolean);
  // Retire le numéro de département en fin de slug.
  if (tokens.length > 1 && /^\d+$/.test(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens
    .map((t) => {
      const arr = t.match(/^(\d+)(?:er|eme|e)$/);
      if (arr) return `${arr[1]}e`;
      return t.charAt(0).toUpperCase() + t.slice(1);
    })
    .join(" ");
}
