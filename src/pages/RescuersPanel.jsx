import { Link } from "react-router-dom";
import { MapPinned, Radio, ShieldCheck, Truck } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { usePublicAffectedZones } from "../hooks/usePublicAffectedZones";

export default function RescuersPanel() {
  const { zones, status } = usePublicAffectedZones();

  return (
    <div className="space-y-6">
      <SectionTitle title="Panel de rescatistas" subtitle="Asignacion de equipos, rutas y registros operativos por zona." action={<Link to="/ubicacion-rescate" className="btn bg-navy text-white">Ubicacion sensible</Link>} />
      <div className="grid md:grid-cols-4 gap-4">
        <Card icon={<ShieldCheck />} title="Equipos activos"  value="0" />
        <Card icon={<Truck />}       title="Unidades moviles" value="0" />
        <Card icon={<Radio />}       title="Canales abiertos" value="0" />
        <Card icon={<MapPinned />}   title="Zonas asignadas"  value={status === "loading" ? "…" : zones.length} />
      </div>

      {status === "loading" && (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Cargando zonas...</div>
      )}

      {status !== "loading" && zones.length === 0 && (
        <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
          Sin zonas asignadas registradas todavia.
        </div>
      )}

      {zones.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          {zones.map((zone) => (
            <div key={zone.id} className="card p-5">
              <h2 className="font-black">{zone.sector}</h2>
              <p className="text-sm text-slate-500">{zone.municipality}, {zone.state}</p>
              <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
                <span className="p-3 rounded-xl bg-slate-50">Prioridad: {zone.level}</span>
                <span className="p-3 rounded-xl bg-slate-50">Radio: {zone.radiusKm != null ? `${zone.radiusKm} km` : "N/D"}</span>
                <span className="p-3 rounded-xl bg-slate-50">Verificacion: {zone.verification || "Pendiente"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ icon, title, value }) {
  return (
    <div className="card p-5">
      <div className="text-rescueBlue">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-3xl font-black">{value}</p>
    </div>
  );
}
