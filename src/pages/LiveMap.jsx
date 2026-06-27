import SectionTitle from "../components/SectionTitle";
import MapPreview from "../components/MapPreview";
import StatusBadge from "../components/StatusBadge";
import { affectedZones } from "../data/affectedZones";
import { mapReports } from "../data/mockData";

export default function LiveMap() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Mapa en vivo" subtitle="Zonas afectadas, radios de impacto y reportes operativos simulados." />
      <div className="grid xl:grid-cols-[320px_1fr] gap-6">
        <aside className="card p-5 space-y-4">
          <h2 className="font-black text-lg">Filtros</h2>
          <select className="input"><option>Todos los reportes</option><option>Emergencias criticas</option><option>Refugios</option><option>Hospitales</option></select>
          <select className="input"><option>Todas las prioridades</option><option>Critica</option><option>Alta</option><option>Media</option></select>
          <div className="space-y-3">
            {affectedZones.map((zone) => (
              <div key={zone.id} className="p-3 rounded-xl bg-slate-50">
                <div className="flex justify-between gap-2">
                  <strong>{zone.sector}</strong>
                  <StatusBadge status={zone.nivel} />
                </div>
                <p className="text-xs text-slate-500">{zone.municipio}, {zone.estado} - radio {zone.radioKm} km</p>
              </div>
            ))}
          </div>
        </aside>
        <section className="card p-5 h-[720px]">
          <MapPreview />
        </section>
      </div>
      <div className="grid md:grid-cols-5 gap-4">
        {mapReports.map((report) => (
          <div key={report.id} className="card p-4">
            <p className="font-black">{report.type}</p>
            <p className="text-sm text-slate-500">{report.zone}</p>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-2xl font-black">{report.count}</span>
              <StatusBadge status={report.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
