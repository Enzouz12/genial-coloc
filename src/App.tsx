import { useEffect, useMemo, useState } from "react";
import type { Offer, OfferStatus } from "./types";
import { ROOMMATES } from "./config";
import { store } from "./lib/storage";
import { getMe, setMe as persistMe } from "./lib/identity";
import { reverseGeocode, estimatedCommuteMinutes } from "./lib/geo";
import { routeToCampus } from "./lib/routing";
import { MapView, type MapMode } from "./components/MapView";
import { AddOfferForm } from "./components/AddOfferForm";
import { OfferList } from "./components/OfferList";
import { OfferNotesModal } from "./components/OfferNotesModal";
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
  // Colocataire actif sur ce navigateur (pour le handshake d'intérêt).
  const [me, setMe] = useState<string>(getMe);
  // Offre dont la modale de notes structurées est ouverte, sinon null.
  const [notesOffer, setNotesOffer] = useState<Offer | null>(null);
  // Offre dont les temps de trajet sont en cours de recalcul.
  const [recalcId, setRecalcId] = useState<string | null>(null);
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

  // Offres affichées sur la carte : on masque les écartées (elles restent
  // dans la liste, triées en bas), sauf si on filtre explicitement dessus.
  const mapOffers = useMemo(
    () =>
      filters.status === "rejected"
        ? visibleOffers
        : visibleOffers.filter((o) => (o.status ?? "new") !== "rejected"),
    [visibleOffers, filters.status]
  );

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

  // Recalcule les temps de trajet d'une offre qui n'en a pas (service
  // indisponible au moment de l'ajout). Ne touche pas aux autres champs.
  async function handleRecalcTimes(offer: Offer) {
    setRecalcId(offer.id);
    try {
      const times = await routeToCampus(offer);
      if (times.transitMin == null && times.bikeMin == null) return;
      await store.update({ ...offer, ...times });
      setOffers(await store.getAll());
    } catch {
      setOffers(await store.getAll());
    } finally {
      setRecalcId(null);
    }
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

  // Mémorise le colocataire actif (pour le handshake).
  function handleSetMe(name: string) {
    setMe(name);
    persistMe(name);
  }

  // Enregistre les notes structurées d'une offre (mise à jour optimiste,
  // sans bascule d'onglet/sélection), puis ferme la modale.
  async function handleSaveNotes(updated: Offer) {
    setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setNotesOffer(null);
    try {
      await store.update(updated);
    } catch {
      setOffers(await store.getAll());
    }
  }

  // Handshake : bascule l'intérêt de « moi » pour une offre. Quand les deux
  // colocataires ont validé, l'offre passe en « à appeler » — mais seulement
  // si elle était encore « nouvelle » (on n'écrase pas un statut posé à la
  // main). On ne rétrograde jamais si un intérêt est ensuite retiré.
  async function handleToggleInterest(offer: Offer) {
    const set = new Set(offer.interestedBy ?? []);
    if (set.has(me)) set.delete(me);
    else set.add(me);
    const interestedBy = [...set];
    const allIn = ROOMMATES.every((r) => set.has(r));
    const status: OfferStatus =
      allIn && (offer.status ?? "new") === "new" ? "to_call" : offer.status ?? "new";
    const updated = { ...offer, interestedBy, status };
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
          <div>
            <h1>Génial Coloc</h1>
            <p>Comparateur d'offres · Lyon</p>
          </div>
          <label className="me-select">
            Je suis
            <select value={me} onChange={(e) => handleSetMe(e.target.value)}>
              {ROOMMATES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
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
            me={me}
            onSelect={selectOffer}
            onSetStatus={handleSetStatus}
            onToggleInterest={handleToggleInterest}
            onOpenNotes={setNotesOffer}
            onRemove={handleRemove}
            onRecalcTimes={handleRecalcTimes}
            recalcId={recalcId}
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
          offers={mapOffers}
          selectedId={selectedId}
          me={me}
          onSelect={selectOffer}
          onToggleInterest={handleToggleInterest}
          onOpenNotes={setNotesOffer}
          onBackgroundClick={() => selectOffer(null)}
          onPinpoint={handlePinpoint}
          pinpointMode={pinpointMode}
          mode={mode}
        />
      </main>

      {notesOffer && (
        <OfferNotesModal
          offer={notesOffer}
          onClose={() => setNotesOffer(null)}
          onSave={handleSaveNotes}
        />
      )}
    </div>
  );
}
