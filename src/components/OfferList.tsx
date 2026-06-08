import type { Offer } from "../types";
import { priceColor } from "../lib/color";
import { distanceToCampusKm, commuteBucket } from "../lib/geo";

/** Classe CSS du badge de trajet selon le palier atteint. */
function commuteClass(threshold: number): string {
  return threshold === 0 ? "commute-plus" : `commute-${threshold}`;
}

interface Props {
  offers: Offer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function OfferList({ offers, selectedId, onSelect, onRemove }: Props) {
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
            onClick={() => onSelect(o.id)}
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
              <div className="offer-sub">
                {o.location}
                {o.addedBy ? ` · ${o.addedBy}` : ""}
              </div>
              {o.notes && <div className="offer-notes">{o.notes}</div>}
              <div className="offer-actions">
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
