import { BUDGET, COMMUTE } from "../config";
import type { MapMode } from "./MapView";

/** Légende dynamique selon le mode de carte actif. */
export function Legend({ mode }: { mode: MapMode }) {
  const tcl = COMMUTE.thresholds;
  const bike = COMMUTE.bikeThresholds;
  const priceLeft = `≤ ${BUDGET.green} €`;
  const priceRight = `${BUDGET.red} €`;

  if (mode === "price") {
    return <Bar title="Loyer" left={priceLeft} right={priceRight} />;
  }
  if (mode === "transit") {
    return <Bar title="Trajet TCL" left={`${tcl[0]} min`} right={`${tcl[tcl.length - 1]}+ min`} />;
  }
  if (mode === "bike") {
    return <Bar title="Trajet vélo" left={`${bike[0]} min`} right={`${bike[bike.length - 1]}+ min`} />;
  }
  return (
    <div className="legend-mixed">
      <Bar title="Intérieur · loyer" left={priceLeft} right={priceRight} />
      <Bar title="Contour · TCL" left={`${tcl[0]} min`} right={`${tcl[tcl.length - 1]}+ min`} />
    </div>
  );
}

function Bar({ title, left, right }: { title: string; left: string; right: string }) {
  return (
    <div className="legend">
      <span className="legend-title">{title}</span>
      <span className="g-green">{left}</span>
      <span className="g-bar" />
      <span className="g-red">{right}</span>
    </div>
  );
}
