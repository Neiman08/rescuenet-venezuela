import { Globe2 } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { usePublicAffectedZones } from "../hooks/usePublicAffectedZones";

const LEVEL_LABEL = { CRITICA: "Critica", ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };

export default function InternationalPanel() {
  const { zones, status } = usePublicAffectedZones();

  return (
    <div className="space-y-6">
      <SectionTitle title="Panel internacional" subtitle="Necesidades verificadas, rutas logisticas y entregas para organizaciones internacionales." />
      <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">
        Sin datos reales registrados todavia.
      </div>

      {status === "loading" && (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Cargando zonas...</div>
      )}

      {status !== "loading" && zones.length === 0 && (
        <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
          No hay zonas afectadas registradas todavia.
        </div>
      )}

      {zones.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          {zones.map((zone) => (
            <div key={zone.id} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-rescuePurple"><Globe2 size={20} /></div>
                <h2 className="font-black">{zone.sector}</h2>
              </div>
              <p className="text-sm text-slate-500">Prioridad {LEVEL_LABEL[zone.level] || zone.level} — {zone.municipality}, {zone.state}</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
                <span className="p-3 rounded-xl bg-slate-50">Zona afectada verificada</span>
                <span className="p-3 rounded-xl bg-slate-50">Estado: {zone.operationalStatus?.replace(/_/g, " ") || "Por confirmar"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
