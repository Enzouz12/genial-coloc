import { STATUSES } from "../config";
import type { OfferStatus } from "../types";

export interface FilterState {
  status: OfferStatus | "all";
  maxPrice: string;
  maxTransit: string;
}

export const EMPTY_FILTERS: FilterState = {
  status: "all",
  maxPrice: "",
  maxTransit: "",
};

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  shown: number;
  total: number;
}

export function Filters({ filters, onChange, shown, total }: Props) {
  const active =
    filters.status !== "all" || filters.maxPrice !== "" || filters.maxTransit !== "";

  return (
    <div className="filters">
      <div className="filters-head">
        <span>Filtres</span>
        <span className="filters-count">{shown} / {total}</span>
      </div>

      <label>
        Statut
        <select
          value={filters.status}
          onChange={(e) =>
            onChange({ ...filters, status: e.target.value as FilterState["status"] })
          }
        >
          <option value="all">Tous</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>

      <div className="row">
        <label>
          Loyer max (€)
          <input
            value={filters.maxPrice}
            inputMode="numeric"
            placeholder="1100"
            onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
          />
        </label>
        <label>
          TCL max (min)
          <input
            value={filters.maxTransit}
            inputMode="numeric"
            placeholder="40"
            onChange={(e) => onChange({ ...filters, maxTransit: e.target.value })}
          />
        </label>
      </div>

      {active && (
        <button type="button" className="btn-ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );
}
