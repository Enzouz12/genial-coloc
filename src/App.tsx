import { useEffect, useState } from "react";
import type { Offer } from "./types";
import { store } from "./lib/storage";
import { BUDGET } from "./config";
import { MapView } from "./components/MapView";
import { AddOfferForm } from "./components/AddOfferForm";
import { OfferList } from "./components/OfferList";
import "./App.css";

export default function App() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

        <div className="legend">
          <span>Budget&nbsp;:</span>
          <span className="g-green">≤ {BUDGET.green} €</span>
          <span className="g-bar" />
          <span className="g-red">{BUDGET.red} €</span>
        </div>

        <OfferList
          offers={offers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRemove={handleRemove}
        />
      </aside>

      <main className="map-wrap">
        <MapView offers={offers} selectedId={selectedId} onSelect={setSelectedId} />
      </main>
    </div>
  );
}
