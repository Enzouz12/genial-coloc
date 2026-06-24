import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Offer, OfferStatus } from "./types";
import { store } from "./lib/storage";
import { getMe, setMe as persistMe } from "./lib/identity";
import {
  STATUSES,
  statusColor,
  ROOMMATES,
  applyInterest,
  averageScore,
  formatScore,
  scoreColor,
} from "./config";
import { distanceToCampusKm } from "./lib/geo";
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
        <div className="offer-card centered">
          <p className="empty">Chargement…</p>
        </div>
      </div>
    );
  }
  if (!offer) {
    return (
      <div className="offer-page">
        <header className="offer-topbar">
          <Link to="/" className="back-link">← Retour à la carte</Link>
          <span className="topbar-brand">Génial Coloc</span>
          <span />
        </header>
        <div className="offer-card centered">
          <p className="empty">Offre introuvable.</p>
          <Link to="/" className="back-link">Retour à la carte</Link>
        </div>
      </div>
    );
  }

  const dist = distanceToCampusKm(offer);
  const pricePerM2 = offer.surface ? Math.round(offer.price / offer.surface) : null;
  const avg = averageScore(offer.details?.reviews);
  const interested = offer.interestedBy ?? [];
  const iAmIn = interested.includes(me);
  const isMatch = ROOMMATES.every((r) => interested.includes(r));

  return (
    <div className="offer-page">
      <header className="offer-topbar">
        <Link to="/" className="back-link">← Retour à la carte</Link>
        <span className="topbar-brand">Génial Coloc</span>
        <label className="me-select">
          Je suis
          <select value={me} onChange={(e) => handleSetMe(e.target.value)}>
            {ROOMMATES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
      </header>

      <div className="offer-page-inner">
        <header className="offer-hero">
          <h1>{offer.title}</h1>
          <p className="offer-hero-loc">
            {offer.location}
            {offer.addedBy ? ` · ajouté par ${offer.addedBy}` : ""}
          </p>
          <div className="metric-row">
            <div className="metric">
              <span className="metric-l">Loyer</span>
              <span className="metric-v">{offer.price} €</span>
            </div>
            {offer.surface ? (
              <div className="metric">
                <span className="metric-l">Surface</span>
                <span className="metric-v">{offer.surface} m²{offer.rooms ? ` · T${offer.rooms}` : ""}</span>
              </div>
            ) : null}
            {pricePerM2 !== null ? (
              <div className="metric">
                <span className="metric-l">Prix au m²</span>
                <span className="metric-v">{pricePerM2} €</span>
              </div>
            ) : null}
            <div className="metric">
              <span className="metric-l">Campus</span>
              <span className="metric-v">{dist.toFixed(1)} km</span>
            </div>
            {offer.transitMin != null ? (
              <div className="metric">
                <span className="metric-l">Trajet TCL</span>
                <span className="metric-v">{offer.transitMin} min</span>
              </div>
            ) : null}
            {offer.bikeMin != null ? (
              <div className="metric">
                <span className="metric-l">Vélo</span>
                <span className="metric-v">{offer.bikeMin} min</span>
              </div>
            ) : null}
          </div>
        </header>

        <div className="decision-bar">
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

          <div className="decision-end">
            {avg !== null && (
              <span className="review-badge" style={{ background: scoreColor(avg) }}>
                ★ {formatScore(avg)}/10
              </span>
            )}
            {offer.url && (
              <a href={offer.url} target="_blank" rel="noreferrer">Voir l'annonce ↗</a>
            )}
          </div>
        </div>

        <OfferDetailEditor key={`${offer.id}-${me}`} offer={offer} me={me} onSave={handleSaveDetails} />
      </div>
    </div>
  );
}
