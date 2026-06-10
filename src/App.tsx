import { useEffect, useMemo, useState } from "react";
import type { Offer, OfferStatus } from "./types";
import { store } from "./lib/storage";
import { reverseGeocode, estimatedCommuteMinutes } from "./lib/geo";
import { MapView, type MapMode } from "./components/MapView";
import { AddOfferForm } from "./components/AddOfferForm";
import { OfferList } from "./components/OfferList";
import { Legend } from "./components/Legend";
import { Filters, EMPTY_FILTERS, type FilterState } from "./components/Filters";
import "./App.css";

const MODES: { id: MapMode; label: string }[] = [
  { id: "price", label: "Prix" },
  { id: "transit", label: "Trajet TCL" },
  { id: "mixed", label: "Mixte" },
  { id: "bike", label: "Vélo" },
  { id: "value", label: "€/m²" },
];

export default function App() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>("price");
  const [editing, setEditing] = useState<Offer | null>(null);
  const [pinpointMode, setPinpointMode] = useState(false);
  const [pinned, setPinned] = useState<{ label: string; key: number } | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  // Onglet de la sidebar : « Ajouter » (saisie/édition) ou « Explorer » (filtres + liste).
  // L'import par extension (#offer=) ouvre directement sur l'onglet Ajouter.
  const [tab, setTab] = useState<"add" | "explore">(() =>
    window.location.hash.startsWith("#offer=") ? "add" : "explore"
  );

  // Offres après application des filtres (statut, loyer max, temps TCL max).
  const visibleOffers = useMemo(() => {
    const maxPrice = filters.maxPrice ? parseInt(filters.maxPrice, 10) : null;
    const maxTransit = filters.maxTransit ? parseInt(filters.maxTransit, 10) : null;
    return offers.filter((o) => {
      if (filters.status !== "all" && (o.status ?? "new") !== filters.status) return false;
      if (maxPrice && o.price > maxPrice) return false;
      if (maxTransit) {
        const t = o.transitMin ?? estimatedCommuteMinutes(o);
        if (t > maxTransit) return false;
      }
      return true;
    });
  }, [offers, filters]);

  useEffect(() => {
    let active = true;
    const load = () => store.getAll().then((o) => active && setOffers(o));
    load();
    // Rafraîchit en temps réel quand l'autre colocataire ajoute/supprime.
    const unsubscribe = store.subscribe?.(load);
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  async function handleAdd(offer: Offer) {
    await store.add(offer);
    setOffers(await store.getAll());
    setSelectedId(offer.id);
  }

  async function handleUpdate(offer: Offer) {
    await store.update(offer);
    setOffers(await store.getAll());
    setSelectedId(offer.id);
    setEditing(null);
  }

  async function handleRemove(id: string) {
    await store.remove(id);
    setOffers(await store.getAll());
    if (selectedId === id) setSelectedId(null);
    if (editing?.id === id) setEditing(null);
  }

  // Sélectionner une offre (marqueur ou liste) la passe en édition ;
  // sélectionner « rien » (clic dans le vide) revient au mode ajout.
  function selectOffer(offer: Offer | null) {
    setSelectedId(offer ? offer.id : null);
    setEditing(offer);
    // Sélectionner une offre bascule sur l'onglet Ajouter pour voir l'édition.
    if (offer) setTab("add");
  }

  async function handlePinpoint(lat: number, lng: number) {
    setPinpointMode(false);
    const r = await reverseGeocode(lat, lng);
    if (r) setPinned({ label: r.label, key: Date.now() });
  }

  // Change le statut d'une offre, sans re-géocoder (mise à jour optimiste).
  async function handleSetStatus(offer: Offer, status: OfferStatus) {
    const updated = { ...offer, status };
    setOffers((prev) => prev.map((o) => (o.id === offer.id ? updated : o)));
    try {
      await store.update(updated);
    } catch {
      setOffers(await store.getAll());
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="brand">
          <h1>Génial Colloc</h1>
          <p>Comparateur d'offres · Lyon</p>
        </header>

        <div className="tabs">
          <button
            className={tab === "add" ? "active" : ""}
            onClick={() => setTab("add")}
          >
            {editing ? "Éditer" : "Ajouter"}
          </button>
          <button
            className={tab === "explore" ? "active" : ""}
            onClick={() => setTab("explore")}
          >
            Explorer{offers.length ? ` (${offers.length})` : ""}
          </button>
        </div>

        {/* Les deux onglets restent montés (état du formulaire et import
            par extension préservés), on bascule juste la visibilité. */}
        <div hidden={tab !== "add"}>
          <AddOfferForm
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onCancelEdit={() => setEditing(null)}
            editing={editing}
            pinpointMode={pinpointMode}
            onTogglePinpoint={() => setPinpointMode((v) => !v)}
            pinnedLocation={pinned}
          />
        </div>

        <div hidden={tab !== "explore"}>
          <Filters
            filters={filters}
            onChange={setFilters}
            shown={visibleOffers.length}
            total={offers.length}
          />

          <OfferList
            offers={visibleOffers}
            selectedId={selectedId}
            onSelect={selectOffer}
            onSetStatus={handleSetStatus}
            onRemove={handleRemove}
          />
        </div>
      </aside>

      <main className={pinpointMode ? "map-wrap pinpoint" : "map-wrap"}>
        <div className="map-modes">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={mode === m.id ? "active" : ""}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="map-legend">
          <Legend mode={mode} />
        </div>
        <MapView
          offers={visibleOffers}
          selectedId={selectedId}
          onSelect={selectOffer}
          onBackgroundClick={() => selectOffer(null)}
          onPinpoint={handlePinpoint}
          pinpointMode={pinpointMode}
          mode={mode}
        />
      </main>
    </div>
  );
}
