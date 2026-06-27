import { Globe2, PackageCheck, Plane, Route } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { affectedZones } from "../data/affectedZones";

export default function InternationalPanel() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Panel internacional" subtitle="Necesidades verificadas, rutas logisticas y entregas para organizaciones internacionales." />
      <div className="grid md:grid-cols-4 gap-4">
        <Metric icon={<Globe2 />} title="Equipos desplegados" value="12" />
        <Metric icon={<PackageCheck />} title="Entregas activas" value="39" />
        <Metric icon={<Route />} title="Rutas logisticas" value="8" />
        <Metric icon={<Plane />} title="Donaciones globales" value="$320k" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {affectedZones.map((zone) => (
          <div key={zone.id} className="card p-5">
            <h2 className="font-black">{zone.sector}</h2>
            <p className="text-sm text-slate-500">Prioridad {zone.nivel} - {zone.estado}</p>
            <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
              <span className="p-3 rounded-xl bg-slate-50">Recursos faltantes: agua, medicinas</span>
              <span className="p-3 rounded-xl bg-slate-50">Ruta: centro logistico Caracas</span>
              <span className="p-3 rounded-xl bg-slate-50">Distribucion: refugios y hospitales</span>
              <span className="p-3 rounded-xl bg-slate-50">Reporte oficial: simulado</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ icon, title, value }) {
  return <div className="card p-5"><div className="text-rescuePurple">{icon}</div><p className="text-sm text-slate-500 mt-3">{title}</p><p className="text-3xl font-black">{value}</p></div>;
}
