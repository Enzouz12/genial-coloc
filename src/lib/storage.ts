import type { Offer, OfferStatus } from "../types";
import { supabase, hasSupabaseConfig } from "./supabase";

/**
 * Couche d'accès aux données.
 *
 * Deux implémentations derrière la même interface :
 * - `supabaseStore` (collaboration temps réel) si les clés sont configurées,
 * - `localStore` (localStorage, zéro config) sinon.
 *
 * Les composants ne connaissent que `store` et ignorent l'implémentation.
 */
export interface OfferStore {
  getAll(): Promise<Offer[]>;
  add(offer: Offer): Promise<void>;
  update(offer: Offer): Promise<void>;
  remove(id: string): Promise<void>;
  /** S'abonne aux changements externes. Retourne une fonction de désinscription. */
  subscribe?(onChange: () => void): () => void;
}

// ---------- localStorage ----------

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
  async update(offer) {
    write(read().map((o) => (o.id === offer.id ? offer : o)));
  },
  async remove(id) {
    write(read().filter((o) => o.id !== id));
  },
};

// ---------- Supabase ----------

/** Ligne de la table `offers` (colonnes en snake_case). */
interface OfferRow {
  id: string;
  url: string | null;
  title: string;
  price: number;
  surface: number | null;
  rooms: number | null;
  location: string;
  lat: number;
  lng: number;
  transit_min: number | null;
  bike_min: number | null;
  added_by: string | null;
  notes: string | null;
  created_at: number;
  status?: string | null;
}

function toRow(o: Offer): OfferRow {
  const row: OfferRow = {
    id: o.id,
    url: o.url || null,
    title: o.title,
    price: o.price,
    surface: o.surface ?? null,
    rooms: o.rooms ?? null,
    location: o.location,
    lat: o.lat,
    lng: o.lng,
    transit_min: o.transitMin ?? null,
    bike_min: o.bikeMin ?? null,
    added_by: o.addedBy ?? null,
    notes: o.notes ?? null,
    created_at: o.createdAt,
  };
  // N'inclut le statut que s'il est défini : compatible avec une base
  // sans la colonne `status` tant que la migration n'a pas été appliquée.
  if (o.status) row.status = o.status;
  return row;
}

function fromRow(r: OfferRow): Offer {
  return {
    id: r.id,
    url: r.url ?? "",
    title: r.title,
    price: r.price,
    surface: r.surface ?? undefined,
    rooms: r.rooms ?? undefined,
    location: r.location,
    lat: r.lat,
    lng: r.lng,
    transitMin: r.transit_min ?? undefined,
    bikeMin: r.bike_min ?? undefined,
    addedBy: r.added_by ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    status: (r.status as OfferStatus) ?? undefined,
  };
}

export const supabaseStore: OfferStore = {
  async getAll() {
    const { data, error } = await supabase!
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as OfferRow[]).map(fromRow);
  },
  async add(offer) {
    const { error } = await supabase!.from("offers").insert(toRow(offer));
    if (error) throw error;
  },
  async update(offer) {
    const { error } = await supabase!
      .from("offers")
      .update(toRow(offer))
      .eq("id", offer.id);
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await supabase!.from("offers").delete().eq("id", id);
    if (error) throw error;
  },
  subscribe(onChange) {
    const channel = supabase!
      .channel("offers-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers" },
        onChange
      )
      .subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  },
};

/** Store actif : Supabase si configuré, sinon localStorage. */
export const store: OfferStore = hasSupabaseConfig ? supabaseStore : localStore;
