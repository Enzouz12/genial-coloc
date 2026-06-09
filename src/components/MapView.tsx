import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { Offer } from "../types";
import { CAMPUS, LYON_CENTER, COMMUTE } from "../config";
import { priceColor, timeColor } from "../lib/color";
import { distanceToCampusKm, estimatedCommuteMinutes } from "../lib/geo";

export type MapMode = "price" | "transit" | "mixed" | "bike";

// Marqueur du campus : badge circulaire stylé.
const campusIcon = L.divIcon({
  className: "campus-marker",
  html: '<div class="campus-pin">🎓</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

interface Props {
  offers: Offer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  mode: MapMode;
}

function transitMinutesOf(o: Offer): number {
  return o.transitMin ?? estimatedCommuteMinutes(o);
}

function bikeMinutesOf(o: Offer): number {
  return o.bikeMin ?? estimatedCommuteMinutes(o);
}

export function MapView({ offers, selectedId, onSelect, mode }: Props) {
  return (
    <MapContainer
      center={[LYON_CENTER.lat, LYON_CENTER.lng]}
      zoom={12}
      className="map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      <Marker position={[CAMPUS.lat, CAMPUS.lng]} icon={campusIcon}>
        <Popup>
          <strong>{CAMPUS.name}</strong>
          <br />
          Point de référence
        </Popup>
      </Marker>

      {offers.map((o) => {
        const transitM = transitMinutesOf(o);
        const bikeM = bikeMinutesOf(o);
        const dist = distanceToCampusKm(o);
        const isSel = o.id === selectedId;

        // Remplissage selon le mode ; le mixte garde le loyer à l'intérieur.
        const fill =
          mode === "transit"
            ? timeColor(transitM)
            : mode === "bike"
              ? timeColor(bikeM, COMMUTE.bikeThresholds)
              : priceColor(o.price);

        // Contour : trajet en mode mixte, sinon liseré sombre discret.
        const stroke =
          mode === "mixed"
            ? timeColor(transitM)
            : isSel
              ? "#1f2937"
              : "rgba(0,0,0,0.35)";

        const weight = mode === "mixed" ? (isSel ? 5 : 3.5) : isSel ? 3 : 1.5;

        return (
          <CircleMarker
            key={o.id}
            center={[o.lat, o.lng]}
            radius={isSel ? 13 : 9}
            pathOptions={{
              color: stroke,
              weight,
              fillColor: fill,
              fillOpacity: 0.9,
              className: isSel ? "gc-marker selected" : "gc-marker",
            }}
            eventHandlers={{ click: () => onSelect(o.id) }}
          >
            <Tooltip direction="top" className="gc-tip">
              {o.price} € · TCL {Math.round(transitM)} min
            </Tooltip>
            <Popup>
              <strong>{o.title}</strong>
              <br />
              {o.price} € CC
              {o.surface ? ` · ${o.surface} m²` : ""}
              {o.rooms ? ` · T${o.rooms}` : ""}
              <br />
              {dist.toFixed(1)} km du campus
              <br />
              {o.transitMin != null && (
                <>
                  TCL {o.transitMin} min
                  <br />
                </>
              )}
              {o.bikeMin != null && (
                <>
                  Vélo {o.bikeMin} min
                  <br />
                </>
              )}
              <a href={o.url} target="_blank" rel="noreferrer">
                Voir l'annonce
              </a>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
