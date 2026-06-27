import { useEffect, useState } from "react";
import SectionTitle from "../components/SectionTitle";
import MapPreview from "../components/MapPreview";
import PublicAccessNotice from "../components/PublicAccessNotice";
import StatusBadge from "../components/StatusBadge";
import { demoDataEnabled, noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { affectedZones } from "../data/affectedZones";
import { mapReports } from "../data/mockData";
import { gisLayers, logisticsCorridors } from "../data/gisLayers";
import { publicApi } from "../lib/api";

export default function LiveMap() {
  const [zones, setZones] = useState(demoDataEnabled ? affectedZones : []);
  const [reports, setReports] = useState(demoDataEnabled ? mapReports : []);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    publicApi.getMap()
      .then((payload) => {
        const nextZones = payload?.zones || [];
        const nextReports = payload?.reports || [];
        setZones(nextZones.length ? nextZones : demoDataEnabled ? affectedZones : []);
        setReports(nextReports.length ? nextReports : demoDataEnabled ? mapReports : []);
        setStatus(nextZones.length || nextReports.length ? "success" : demoDataEnabled ? "fallback" : "empty");
      })
      .catch(() => {
        setZones(demoDataEnabled ? affectedZones : []);
        setReports(demoDataEnabled ? mapReports : []);
        setStatus(demoDataEnabled ? "fallback" : "error");
      });
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle title="Mapa en vivo" subtitle="Zonas afectadas, radios de impacto y reportes operativos simulados." />
      <PublicAccessNotice text="No necesitas crear cuenta para ver el mapa publico y ubicar ayuda cercana." />
      {status === "fallback" && <div className="rounded-2xl bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">No pudimos conectar con el mapa publico del backend. Mostrando datos simulados locales.</div>}
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {status === "empty" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>}
      <div className="grid xl:grid-cols-[320px_1fr] gap-6">
        <aside className="card p-5 space-y-4">
          <h2 className="font-black text-lg">Filtros</h2>
          <select className="input"><option>Todos los reportes</option><option>Emergencias criticas</option><option>Refugios</option><option>Hospitales</option></select>
          <select className="input"><option>Todas las prioridades</option><option>Critica</option><option>Alta</option><option>Media</option></select>
          <div className="space-y-3">
            {zones.map((zone) => (
              <div key={zone.id} className="p-3 rounded-xl bg-slate-50">
                <div className="flex justify-between gap-2">
                  <strong>{zone.sector}</strong>
                  <StatusBadge status={zone.nivel || zone.level} />
                </div>
                <p className="text-xs text-slate-500">{zone.municipio || zone.municipality}, {zone.estado || zone.state} - radio {zone.radioKm || zone.radiusKm} km</p>
              </div>
            ))}
          </div>
          <h2 className="font-black text-lg pt-2">Capas GIS</h2>
          <div className="space-y-2">
            {gisLayers.map((layer) => (
              <label key={layer.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 text-sm">
                <input type="checkbox" defaultChecked={layer.visible} />
                <span className="font-semibold flex-1">{layer.label}</span>
                <span className="text-xs text-slate-500">{layer.status}</span>
              </label>
            ))}
          </div>
        </aside>
        <section className="card p-5 h-[720px]">
          <MapPreview zonesData={zones} reports={reports} />
        </section>
      </div>
      <div className="grid md:grid-cols-5 gap-4">
        {reports.map((report) => (
          <div key={report.id} className="card p-4">
            <p className="font-black">{report.type}</p>
            <p className="text-sm text-slate-500">{report.zone || report.affectedZone?.sector}</p>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-2xl font-black">{report.count || report.peopleAffected || 1}</span>
              <StatusBadge status={report.status} />
            </div>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <h2 className="font-black mb-4">Corredores logisticos</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {logisticsCorridors.map((corridor) => (
            <div key={corridor.id} className="p-4 rounded-2xl bg-slate-50">
              <p className="font-black">{corridor.id}</p>
              <p className="text-sm text-slate-600">{corridor.origin} - {corridor.destination}</p>
              <div className="flex gap-2 mt-3">
                <StatusBadge status={corridor.status} />
                <span className="badge bg-orange-100 text-orange-700">Riesgo {corridor.risk}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
