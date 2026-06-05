import type { Offer } from "../types";

/**
 * Couche d'accès aux données.
 *
 * Implémentation actuelle : localStorage (zéro config, marche tout de suite).
 * Pour passer à la collaboration temps réel, il suffira de réécrire ce
 * module avec un client Supabase en gardant la même interface `OfferStore`.
 */
export interface OfferStore {
  getAll(): Promise<Offer[]>;
  add(offer: Offer): Promise<void>;
  remove(id: string): Promise<void>;
}

const KEY = "genial-colloc.offers";

function read(): Offer[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Offer[]) : [];
  } catch {
    return [];
  }
}

function write(offers: Offer[]): void {
  localStorage.setItem(KEY, JSON.stringify(offers));
}

export const localStore: OfferStore = {
  async getAll() {
    return read().sort((a, b) => b.createdAt - a.createdAt);
  },
  async add(offer) {
    const offers = read();
    offers.push(offer);
    write(offers);
  },
  async remove(id) {
    write(read().filter((o) => o.id !== id));
  },
};

/** Store actif de l'application (point unique à changer pour Supabase). */
export const store: OfferStore = localStore;
