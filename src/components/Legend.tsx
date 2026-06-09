import { BUDGET, COMMUTE } from "../config";
import type { MapMode } from "./MapView";

/** Légende dynamique selon le mode de carte actif. */
export function Legend({ mode }: { mode: MapMode }) {
  const lo = COMMUTE.thresholds[0];
  const hi = COMMUTE.thresholds[COMMUTE.thresholds.length - 1];
  const priceLeft = `≤ ${BUDGET.green} €`;
  const priceRight = `${BUDGET.red} €`;
  const timeLeft = `${lo} min`;
  const timeRight = `${hi}+ min`;

  if (mode === "price") {
    return <Bar title="Loyer" left={priceLeft} right={priceRight} />;
  }
  if (mode === "transit") {
    return <Bar title="Trajet TCL" left={timeLeft} right={timeRight} />;
  }
  if (mode === "bike") {
    return <Bar title="Trajet vélo" left={timeLeft} right={timeRight} />;
  }
  return (
    <div className="legend-mixed">
      <Bar title="Intérieur · loyer" left={priceLeft} right={priceRight} />
      <Bar title="Contour · TCL" left={timeLeft} right={timeRight} />
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
