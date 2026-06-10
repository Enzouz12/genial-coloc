import { BUDGET, COMMUTE, VALUE } from "../config";
import type { MapMode } from "./MapView";

/** Légende dynamique selon le mode de carte actif. */
export function Legend({ mode }: { mode: MapMode }) {
  const tcl = COMMUTE.thresholds;
  const bike = COMMUTE.bikeThresholds;

  if (mode === "price") {
    return <Bar title="Loyer mensuel (charges comprises)" left={`avantageux · ≤ ${BUDGET.green} €`} right={`plafond · ${BUDGET.red} €`} />;
  }
  if (mode === "transit") {
    return <Bar title="Trajet en TCL le matin" left={`proche · ${tcl[0]} min`} right={`loin · ${tcl[tcl.length - 1]}+ min`} />;
  }
  if (mode === "bike") {
    return <Bar title="Trajet à vélo" left={`proche · ${bike[0]} min`} right={`loin · ${bike[bike.length - 1]}+ min`} />;
  }
  if (mode === "value") {
    return <Bar title="Prix au m² (loyer ÷ surface)" left={`bon · ≤ ${VALUE.green} €/m²`} right={`cher · ${VALUE.red}+ €/m²`} />;
  }
  return (
    <div className="legend-mixed">
      <Bar title="Remplissage · loyer mensuel" left={`≤ ${BUDGET.green} €`} right={`${BUDGET.red} €`} />
      <Bar title="Contour · trajet en TCL" left={`${tcl[0]} min`} right={`${tcl[tcl.length - 1]}+ min`} />
    </div>
  );
}

function Bar({ title, left, right }: { title: string; left: string; right: string }) {
  return (
    <div className="legend">
      <span className="legend-title">{title}</span>
      <span className="g-bar" />
      <div className="legend-ends">
        <span className="g-green">{left}</span>
        <span className="g-red">{right}</span>
      </div>
    </div>
  );
}
