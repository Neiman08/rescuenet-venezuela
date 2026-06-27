import { MapContainer, TileLayer, Circle, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { affectedZones } from "../data/affectedZones";
import { mapReports } from "../data/mockData";

const colors = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#2563eb",
  purple: "#7c3aed",
  cyan: "#06b6d4",
  orange: "#f97316",
};

export default function MapPreview({ zones = true }) {
  return (
    <MapContainer center={[10.35, -67.15]} zoom={8} scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {zones &&
        affectedZones.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lng]}
            radius={zone.radioKm * 1000}
            pathOptions={{ color: zone.nivel === "critica" ? "#ef4444" : "#f97316", fillOpacity: 0.08 }}
          />
        ))}
      {mapReports.map((r) => (
        <CircleMarker
          key={r.id}
          center={[r.lat, r.lng]}
          radius={18}
          pathOptions={{ color: colors[r.color], fillColor: colors[r.color], fillOpacity: 0.85 }}
        >
          <Popup>
            <strong>{r.type}</strong>
            <br />
            Zona: {r.zone}
            <br />
            Estado: {r.status}
            <br />
            Cantidad: {r.count}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
