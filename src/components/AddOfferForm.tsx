import { useState } from "react";
import type { Offer } from "../types";
import { ROOMMATES } from "../config";
import { geocode } from "../lib/geo";

interface Props {
  onAdd: (offer: Offer) => void;
}

export function AddOfferForm({ onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [surface, setSurface] = useState("");
  const [rooms, setRooms] = useState("");
  const [location, setLocation] = useState("");
  const [addedBy, setAddedBy] = useState<string>(ROOMMATES[0]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNum = parseInt(price, 10);
    if (!title.trim() || Number.isNaN(priceNum) || !location.trim()) {
      setError("Titre, prix et quartier/adresse sont obligatoires.");
      return;
    }

    setBusy(true);
    try {
      const geo = await geocode(location);
      if (!geo) {
        setError("Adresse introuvable. Précise le quartier ou la rue.");
        return;
      }

      onAdd({
        id: crypto.randomUUID(),
        title: title.trim(),
        url: url.trim(),
        price: priceNum,
        surface: surface ? parseInt(surface, 10) : undefined,
        rooms: rooms ? parseInt(rooms, 10) : undefined,
        location: geo.label,
        lat: geo.lat,
        lng: geo.lng,
        addedBy,
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
      });

      // Reset
      setTitle("");
      setUrl("");
      setPrice("");
      setSurface("");
      setRooms("");
      setLocation("");
      setNotes("");
    } catch {
      setError("Erreur réseau pendant le géocodage. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Ajouter une offre</h2>

      <label>
        Titre *
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="T2 lumineux Bron" />
      </label>

      <label>
        Lien
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.seloger.com/…" />
      </label>

      <div className="row">
        <label>
          Loyer CC (€) *
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="950" />
        </label>
        <label>
          Surface (m²)
          <input value={surface} onChange={(e) => setSurface(e.target.value)} inputMode="numeric" placeholder="42" />
        </label>
        <label>
          Pièces
          <input value={rooms} onChange={(e) => setRooms(e.target.value)} inputMode="numeric" placeholder="2" />
        </label>
      </div>

      <label>
        Quartier / adresse * <small>(géocodé via la BAN)</small>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bron, avenue Franklin Roosevelt" />
      </label>

      <div className="row">
        <label>
          Ajouté par
          <select value={addedBy} onChange={(e) => setAddedBy(e.target.value)}>
            {ROOMMATES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="grow">
          Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Meublé, dispo sept., 3e étage…" />
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={busy}>
        {busy ? "Géocodage…" : "Ajouter à la carte"}
      </button>
    </form>
  );
}
