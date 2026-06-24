import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Offer, OfferStatus } from "./types";
import { store } from "./lib/storage";
import { getMe, setMe as persistMe } from "./lib/identity";
import { STATUSES, statusColor, ROOMMATES, applyInterest } from "./config";
import { distanceToCampusKm, commuteBucket } from "./lib/geo";
import { OfferDetailEditor } from "./components/OfferDetailEditor";

/** Page dédiée d'une annonce : en-tête (statut, handshake) + éditeur de notes. */
export function OfferDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [me, setMe] = useState<string>(getMe);

  useEffect(() => {
    let active = true;
    const load = () => store.getAll().then((o) => active && setOffers(o));
    load();
    const unsub = store.subscribe?.(load);
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  const offer = offers?.find((o) => o.id === id) ?? null;

  // Mise à jour optimiste + persistance, sans quitter la page.
  async function patch(updated: Offer) {
    setOffers((prev) => (prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev));
    try {
      await store.update(updated);
    } catch {
      setOffers(await store.getAll());
    }
  }

  function handleSetMe(name: string) {
    setMe(name);
    persistMe(name);
  }

  // Enregistre les notes structurées puis revient à la carte.
  async function handleSaveDetails(updated: Offer) {
    await patch(updated);
    navigate("/");
  }

  if (offers === null) {
    return (
      <div className="offer-page">
        <p className="empty">Chargement…</p>
      </div>
    );
  }
  if (!offer) {
    return (
      <div className="offer-page">
        <Link to="/" className="back-link">← Retour</Link>
        <p className="empty">Offre introuvable.</p>
      </div>
    );
  }

  const dist = distanceToCampusKm(offer);
  const commute = commuteBucket(offer);
  const interested = offer.interestedBy ?? [];
  const iAmIn = interested.includes(me);
  const isMatch = ROOMMATES.every((r) => interested.includes(r));

  return (
    <div className="offer-page">
      <div className="offer-page-top">
        <Link to="/" className="back-link">← Retour à la carte</Link>
        <label className="me-select">
          Je suis
          <select value={me} onChange={(e) => handleSetMe(e.target.value)}>
            {ROOMMATES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>

      <header className="offer-page-head">
        <h1>{offer.title}</h1>
        <div className="offer-page-meta">
          <span className="price">{offer.price} €</span>
          {offer.surface ? <span>{offer.surface} m²</span> : null}
          {offer.rooms ? <span>T{offer.rooms}</span> : null}
          <span>{dist.toFixed(1)} km</span>
          <span className="badge">{commute.label}</span>
          {(offer.transitMin != null || offer.bikeMin != null) && (
            <span className="muted">
              {offer.transitMin != null ? `TCL ${offer.transitMin} min` : ""}
              {offer.transitMin != null && offer.bikeMin != null ? " · " : ""}
              {offer.bikeMin != null ? `Vélo ${offer.bikeMin} min` : ""}
            </span>
          )}
          {offer.url && (
            <a href={offer.url} target="_blank" rel="noreferrer">Annonce ↗</a>
          )}
        </div>

        <div className="offer-page-controls">
          <select
            className="status-select"
            value={offer.status ?? "new"}
            style={{ color: statusColor(offer.status) }}
            onChange={(e) => patch({ ...offer, status: e.target.value as OfferStatus })}
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          <div className="handshake">
            <button
              className={iAmIn ? "interest-btn active" : "interest-btn"}
              onClick={() => patch(applyInterest(offer, me))}
            >
              {iAmIn ? "✓ Tu es partant" : "👍 Ça m'intéresse"}
            </button>
            <span className="interest-tags">
              {ROOMMATES.map((r) => (
                <span key={r} className={interested.includes(r) ? "tag in" : "tag out"}>
                  {interested.includes(r) ? "✓" : "◻"} {r}
                </span>
              ))}
            </span>
            {isMatch && <span className="match-badge">🤝 Match</span>}
          </div>
        </div>
      </header>

      <OfferDetailEditor key={`${offer.id}-${me}`} offer={offer} me={me} onSave={handleSaveDetails} />
    </div>
  );
}
