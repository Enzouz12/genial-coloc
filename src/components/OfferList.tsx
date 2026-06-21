import type { Offer, OfferStatus } from "../types";
import { ROOMMATES, STATUSES, statusColor } from "../config";
import { priceColor } from "../lib/color";
import { distanceToCampusKm, commuteBucket } from "../lib/geo";

/** Classe CSS du badge de trajet selon le palier atteint. */
function commuteClass(threshold: number): string {
  return threshold === 0 ? "commute-plus" : `commute-${threshold}`;
}

interface Props {
  offers: Offer[];
  selectedId: string | null;
  /** Colocataire actif (pour le bouton « Ça m'intéresse »). */
  me: string;
  onSelect: (offer: Offer) => void;
  onSetStatus: (offer: Offer, status: OfferStatus) => void;
  /** Bascule l'intérêt de « moi » pour une offre (handshake). */
  onToggleInterest: (offer: Offer) => void;
  onRemove: (id: string) => void;
  /** Relance le calcul des temps de trajet (offres sans temps réels). */
  onRecalcTimes: (offer: Offer) => void;
  /** Id de l'offre dont le recalcul est en cours, sinon null. */
  recalcId: string | null;
}

export function OfferList({
  offers,
  selectedId,
  me,
  onSelect,
  onSetStatus,
  onToggleInterest,
  onRemove,
  onRecalcTimes,
  recalcId,
}: Props) {
  if (offers.length === 0) {
    return <p className="empty">Aucune offre pour l'instant. Ajoute-en une ! 👆</p>;
  }

  // Les offres écartées sont reléguées en bas (tri stable).
  const ordered = [...offers].sort(
    (a, b) => Number(a.status === "rejected") - Number(b.status === "rejected")
  );

  return (
    <ul className="offer-list">
      {ordered.map((o) => {
        const dist = distanceToCampusKm(o);
        const commute = commuteBucket(o);
        const interested = o.interestedBy ?? [];
        const iAmIn = interested.includes(me);
        const isMatch = ROOMMATES.every((r) => interested.includes(r));
        return (
          <li
            key={o.id}
            className={o.id === selectedId ? "offer selected" : "offer"}
            style={{ borderLeftWidth: 4, borderLeftColor: statusColor(o.status) }}
            onClick={() => onSelect(o)}
          >
            <span className="dot" style={{ background: priceColor(o.price) }} />
            <div className="offer-body">
              <div className="offer-head">
                <strong>{o.title}</strong>
                <span className="price">{o.price} €</span>
              </div>
              <div className="offer-meta">
                {o.surface ? `${o.surface} m² · ` : ""}
                {o.rooms ? `T${o.rooms} · ` : ""}
                {dist.toFixed(1)} km
                <span className={`badge ${commuteClass(commute.threshold)}`}>
                  {commute.label}
                </span>
              </div>
              {(o.transitMin != null || o.bikeMin != null) && (
                <div className="offer-commute">
                  {o.transitMin != null && <span>TCL {o.transitMin} min</span>}
                  {o.bikeMin != null && <span>Vélo {o.bikeMin} min</span>}
                </div>
              )}
              <div className="offer-sub">
                {o.location}
                {o.addedBy ? ` · ${o.addedBy}` : ""}
              </div>
              {o.notes && <div className="offer-notes">{o.notes}</div>}
              <div className="handshake">
                <button
                  className={iAmIn ? "interest-btn active" : "interest-btn"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleInterest(o);
                  }}
                >
                  {iAmIn ? "✓ Tu es partant" : "👍 Ça m'intéresse"}
                </button>
                <span className="interest-tags">
                  {ROOMMATES.map((r) => (
                    <span
                      key={r}
                      className={interested.includes(r) ? "tag in" : "tag out"}
                    >
                      {interested.includes(r) ? "✓" : "◻"} {r}
                    </span>
                  ))}
                </span>
                {isMatch && <span className="match-badge">🤝 Match</span>}
              </div>
              <div className="offer-actions">
                <select
                  className="status-select"
                  value={o.status ?? "new"}
                  style={{ color: statusColor(o.status) }}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSetStatus(o, e.target.value as OfferStatus);
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
                {o.url && (
                  <a href={o.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    Annonce ↗
                  </a>
                )}
                {(o.transitMin == null || o.bikeMin == null) && (
                  <button
                    className="link-action"
                    disabled={o.id === recalcId}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRecalcTimes(o);
                    }}
                  >
                    {o.id === recalcId ? "Calcul…" : "⟳ Recalculer les temps"}
                  </button>
                )}
                <button
                  className="link-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(o.id);
                  }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
