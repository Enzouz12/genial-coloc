import type { Offer, OfferStatus } from "../types";
import { STATUSES, statusColor } from "../config";
import { priceColor } from "../lib/color";
import { distanceToCampusKm, commuteBucket } from "../lib/geo";

/** Classe CSS du badge de trajet selon le palier atteint. */
function commuteClass(threshold: number): string {
  return threshold === 0 ? "commute-plus" : `commute-${threshold}`;
}

interface Props {
  offers: Offer[];
  selectedId: string | null;
  onSelect: (offer: Offer) => void;
  onSetStatus: (offer: Offer, status: OfferStatus) => void;
  onRemove: (id: string) => void;
}

export function OfferList({ offers, selectedId, onSelect, onSetStatus, onRemove }: Props) {
  if (offers.length === 0) {
    return <p className="empty">Aucune offre pour l'instant. Ajoute-en une ! 👆</p>;
  }

  return (
    <ul className="offer-list">
      {offers.map((o) => {
        const dist = distanceToCampusKm(o);
        const commute = commuteBucket(o);
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
