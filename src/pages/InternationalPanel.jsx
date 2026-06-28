import { Globe2 } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { affectedZones } from "../data/affectedZones";

export default function InternationalPanel() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Panel internacional" subtitle="Necesidades verificadas, rutas logisticas y entregas para organizaciones internacionales." />
      <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">
        Sin datos reales registrados todavía.
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {affectedZones.map((zone) => (
          <div key={zone.id} className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-rescuePurple"><Globe2 size={20} /></div>
              <h2 className="font-black">{zone.sector}</h2>
            </div>
            <p className="text-sm text-slate-500">Prioridad {zone.nivel} - {zone.estado}</p>
            <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
              <span className="p-3 rounded-xl bg-slate-50">Zona afectada verificada</span>
              <span className="p-3 rounded-xl bg-slate-50">Afectaciones: {zone.afectaciones?.slice(0, 2).join(", ") || "Por confirmar"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
