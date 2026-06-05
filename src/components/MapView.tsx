import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { CAMPUS, LYON_CENTER } from "../config";

// Icône dédiée pour le campus (sinon Leaflet cherche des assets cassés par Vite).
const campusIcon = L.divIcon({
  className: "campus-marker",
  html: "🎓",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export function MapView() {
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
    </MapContainer>
  );
}
