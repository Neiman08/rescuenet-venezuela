import { MapContainer, TileLayer, Circle, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { demoDataEnabled } from "../config/demoData";
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

export default function MapPreview({ zones = true, zonesData = demoDataEnabled ? affectedZones : [], reports = demoDataEnabled ? mapReports : [] }) {
  return (
    <MapContainer center={[10.35, -67.15]} zoom={8} scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {zones &&
        zonesData.map((zone) => (
          <Circle
            key={zone.id}
            center={[Number(zone.approximateLat ?? zone.lat), Number(zone.approximateLng ?? zone.lng)]}
            radius={(zone.radioKm || zone.radiusKm || 4) * 1000}
            pathOptions={{ color: (zone.nivel || zone.level) === "critica" || (zone.level) === "CRITICA" ? "#ef4444" : "#f97316", fillOpacity: 0.08 }}
          />
        ))}
      {reports.map((r) => (
        <CircleMarker
          key={r.id}
          center={[Number(r.affectedZone?.approximateLat ?? r.lat ?? 10.35), Number(r.affectedZone?.approximateLng ?? r.lng ?? -67.15)]}
          radius={18}
          pathOptions={{ color: colors[r.color] || "#ef4444", fillColor: colors[r.color] || "#ef4444", fillOpacity: 0.85 }}
        >
          <Popup>
            <strong>{r.type}</strong>
            <br />
            Zona: {r.zone || r.affectedZone?.sector || "No indicada"}
            <br />
            Estado: {r.status}
            <br />
            Cantidad: {r.count || r.peopleAffected || 1}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
