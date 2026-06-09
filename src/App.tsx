import { useEffect, useState } from "react";
import type { Offer } from "./types";
import { store } from "./lib/storage";
import { MapView, type MapMode } from "./components/MapView";
import { AddOfferForm } from "./components/AddOfferForm";
import { OfferList } from "./components/OfferList";
import { Legend } from "./components/Legend";
import "./App.css";

const MODES: { id: MapMode; label: string }[] = [
  { id: "price", label: "Prix" },
  { id: "transit", label: "Trajet TCL" },
  { id: "mixed", label: "Mixte" },
  { id: "bike", label: "Vélo" },
];

export default function App() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>("price");

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

  async function handleRemove(id: string) {
    await store.remove(id);
    setOffers(await store.getAll());
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="brand">
          <h1>Génial Colloc</h1>
          <p>Comparateur d'offres · Lyon</p>
        </header>

        <AddOfferForm onAdd={handleAdd} />

        <Legend mode={mode} />

        <OfferList
          offers={offers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRemove={handleRemove}
        />
      </aside>

      <main className="map-wrap">
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
        <MapView
          offers={offers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          mode={mode}
        />
      </main>
    </div>
  );
}
