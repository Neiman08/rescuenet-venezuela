import { Link } from "react-router-dom";
import { MapPinned, Radio, ShieldCheck, Truck } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { affectedZones } from "../data/affectedZones";

export default function RescuersPanel() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Panel de rescatistas" subtitle="Asignacion de equipos, rutas y registros operativos por zona." action={<Link to="/ubicacion-rescate" className="btn bg-navy text-white">Ubicacion sensible</Link>} />
      <div className="grid md:grid-cols-4 gap-4">
        <Card icon={<ShieldCheck />} title="Equipos activos" value="0" />
        <Card icon={<Truck />} title="Unidades moviles" value="0" />
        <Card icon={<Radio />} title="Canales abiertos" value="0" />
        <Card icon={<MapPinned />} title="Zonas asignadas" value={affectedZones.length} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {affectedZones.map((zone) => (
          <div key={zone.id} className="card p-5">
            <h2 className="font-black">{zone.sector}</h2>
            <p className="text-sm text-slate-500">{zone.municipio}, {zone.estado}</p>
            <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
              <span className="p-3 rounded-xl bg-slate-50">Prioridad: {zone.nivel}</span>
              <span className="p-3 rounded-xl bg-slate-50">Radio: {zone.radioKm} km</span>
              <span className="p-3 rounded-xl bg-slate-50">Verificacion: {zone.verificacion}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ icon, title, value }) {
  return <div className="card p-5"><div className="text-rescueBlue">{icon}</div><p className="text-sm text-slate-500 mt-3">{title}</p><p className="text-3xl font-black">{value}</p></div>;
}
