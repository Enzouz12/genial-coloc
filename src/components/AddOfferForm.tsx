import { useEffect, useState } from "react";
import type { Offer } from "../types";
import { ROOMMATES } from "../config";
import { geocode } from "../lib/geo";
import { routeToCampus } from "../lib/routing";
import { parsePasted } from "../lib/parseSeLoger";

interface Props {
  onAdd: (offer: Offer) => void;
  onUpdate: (offer: Offer) => void;
  onCancelEdit: () => void;
  editing: Offer | null;
}

/** Titre court au format "T2 // Rue d'Amboise 69002 Lyon". */
function buildTitle(rooms: number | undefined, label: string): string {
  return rooms ? `T${rooms} // ${label}` : label;
}

export function AddOfferForm({ onAdd, onUpdate, onCancelEdit, editing }: Props) {
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

  function resetForm() {
    setTitle("");
    setUrl("");
    setPrice("");
    setSurface("");
    setRooms("");
    setLocation("");
    setNotes("");
    setError(null);
  }

  // Pré-remplissage depuis l'extension navigateur (hash #offer=...).
  useEffect(() => {
    const m = window.location.hash.match(/^#offer=(.+)$/);
    if (!m) return;
    try {
      const data = JSON.parse(decodeURIComponent(m[1]));
      const fromUrl = data.url ? parsePasted(data.url) : {};
      const u = data.url || fromUrl.url;
      if (u) setUrl(u);
      if (data.title) setTitle(String(data.title));
      const loc = data.location || fromUrl.location;
      if (loc) setLocation(loc);
      if (data.price) setPrice(String(data.price));
      if (data.surface) setSurface(String(data.surface));
      if (data.rooms) setRooms(String(data.rooms));
    } catch {
      // payload invalide, on ignore
    }
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  // Remplit le formulaire quand on passe une offre en édition.
  useEffect(() => {
    if (!editing) return;
    setTitle(editing.title);
    setUrl(editing.url);
    setPrice(String(editing.price));
    setSurface(editing.surface != null ? String(editing.surface) : "");
    setRooms(editing.rooms != null ? String(editing.rooms) : "");
    setLocation(editing.location);
    setAddedBy(editing.addedBy ?? ROOMMATES[0]);
    setNotes(editing.notes ?? "");
    setError(null);
  }, [editing]);

  /** Pré-remplit les champs à partir d'un copier-coller d'annonce. */
  function handlePaste(text: string) {
    const d = parsePasted(text);
    if (d.url) setUrl(d.url);
    if (d.location) setLocation(d.location);
    if (d.price) setPrice(String(d.price));
    if (d.surface) setSurface(String(d.surface));
    if (d.rooms) setRooms(String(d.rooms));
  }

  function handleCancel() {
    resetForm();
    onCancelEdit();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNum = parseInt(price, 10);
    if (Number.isNaN(priceNum) || !location.trim()) {
      setError("Le loyer et le quartier/adresse sont obligatoires.");
      return;
    }

    setBusy(true);
    try {
      const geo = await geocode(location);
      if (!geo) {
        setError("Adresse introuvable dans l'agglomération lyonnaise. Ajoute la ville ou le code postal.");
        return;
      }

      const times = await routeToCampus(geo);
      const roomsNum = rooms ? parseInt(rooms, 10) : undefined;

      const base = {
        title: title.trim() || buildTitle(roomsNum, geo.label),
        url: url.trim(),
        price: priceNum,
        surface: surface ? parseInt(surface, 10) : undefined,
        rooms: roomsNum,
        location: geo.label,
        lat: geo.lat,
        lng: geo.lng,
        transitMin: times.transitMin,
        bikeMin: times.bikeMin,
        addedBy,
        notes: notes.trim() || undefined,
      };

      if (editing) {
        onUpdate({ ...editing, ...base });
      } else {
        onAdd({ id: crypto.randomUUID(), ...base, createdAt: Date.now() });
      }
      resetForm();
    } catch {
      setError("Erreur réseau pendant le calcul. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>{editing ? "Modifier l'offre" : "Ajouter une offre"}</h2>

      {!editing && (
        <label>
          Coller l'annonce (pré-remplit prix/surface/lien)
          <textarea
            rows={2}
            placeholder="Colle ici le texte ou le lien SeLoger…"
            onChange={(e) => handlePaste(e.target.value)}
          />
        </label>
      )}

      <label>
        Titre <small>(optionnel, généré sinon)</small>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="T2 // Rue d'Amboise 69002 Lyon" />
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

      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {busy ? "Calcul en cours…" : editing ? "Enregistrer" : "Ajouter à la carte"}
        </button>
        {editing && (
          <button type="button" className="btn-ghost" onClick={handleCancel} disabled={busy}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
