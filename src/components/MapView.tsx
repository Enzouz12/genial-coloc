import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { Offer } from "../types";
import { CAMPUS, LYON_CENTER } from "../config";
import { priceColor } from "../lib/color";
import { distanceToCampusKm, commuteBucket } from "../lib/geo";

// Icône dédiée pour le campus (sinon Leaflet cherche des assets cassés par Vite).
const campusIcon = L.divIcon({
  className: "campus-marker",
  html: "🎓",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface Props {
  offers: Offer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MapView({ offers, selectedId, onSelect }: Props) {
  return (
    <MapContainer
      center={[LYON_CENTER.lat, LYON_CENTER.lng]}
      zoom={12}
      className="map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[CAMPUS.lat, CAMPUS.lng]} icon={campusIcon}>
        <Popup>
          <strong>{CAMPUS.name}</strong>
          <br />
          Point de référence
        </Popup>
      </Marker>

      {offers.map((o) => {
        const dist = distanceToCampusKm(o);
        const commute = commuteBucket(o);
        const isSelected = o.id === selectedId;
        return (
          <CircleMarker
            key={o.id}
            center={[o.lat, o.lng]}
            radius={isSelected ? 14 : 10}
            pathOptions={{
              color: isSelected ? "#111" : "#fff",
              weight: isSelected ? 3 : 1.5,
              fillColor: priceColor(o.price),
              fillOpacity: 0.9,
            }}
            eventHandlers={{ click: () => onSelect(o.id) }}
          >
            <Tooltip direction="top">
              {o.price} € · {commute.label}
            </Tooltip>
            <Popup>
              <strong>{o.title}</strong>
              <br />
              {o.price} € CC
              {o.surface ? ` · ${o.surface} m²` : ""}
              {o.rooms ? ` · T${o.rooms}` : ""}
              <br />
              {dist.toFixed(1)} km · {commute.label} du campus
              <br />
              {o.transitMin != null && <>TCL {o.transitMin} min<br /></>}
              {o.bikeMin != null && <>Vélo {o.bikeMin} min<br /></>}
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
