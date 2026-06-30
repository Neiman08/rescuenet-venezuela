import { useEffect, useState } from "react";
import SectionTitle from "../components/SectionTitle";
import MapPreview from "../components/MapPreview";
import PublicAccessNotice from "../components/PublicAccessNotice";
import StatusBadge from "../components/StatusBadge";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

function mapCenterType(recordType) {
  const labels = {
    hospital: ["Hospital", "blue"],
    shelter: ["Refugio", "green"],
    collection_center: ["Centro de acopio", "purple"],
    medical_point: ["Punto medico", "red"],
    water_point: ["Punto de agua", "cyan"],
    food_point: ["Punto de alimentos", "orange"],
    pet_aid_center: ["Mascotas", "green"],
    logistics_center: ["Logistica", "purple"],
    help_center: ["Centro de ayuda", "purple"],
  };
  return labels[recordType] || [recordType || "Centro de ayuda", "purple"];
}

export default function LiveMap() {
  const [zones, setZones] = useState([]);
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("loading");
  const [includeInternational, setIncludeInternational] = useState(false);
  const [internationalCount, setInternationalCount] = useState(0);

  useEffect(() => {
    setStatus("loading");
    publicApi.getMap({ includeInternational })
      .then((payload) => {
        const nextZones = payload?.zones || [];
        setInternationalCount(payload?.internationalCentersCount || 0);
        const resourceReports = [
          ...(payload?.hospitals || []).map((item) => ({ id: `hospital-${item.id || item.name}`, type: "Hospital", status: item.status || item.operationalStatus || "Operativo", zone: item.affectedZone?.sector || item.publicLocation, affectedZone: item.affectedZone || item.affectedOperationalZone, color: "blue" })),
          ...(payload?.shelters || []).map((item) => ({ id: `shelter-${item.id || item.name}`, type: "Refugio", status: item.status || item.operationalStatus || "Operativo", zone: item.affectedZone?.sector || item.publicLocation, affectedZone: item.affectedZone || item.affectedOperationalZone, color: "green" })),
          ...(payload?.helpCenters || []).map((item) => {
            const [type, color] = mapCenterType(item.recordType);
            return { id: `center-${item.id || item.name}`, type, status: item.operationalStatus || "Aprobado", zone: item.publicLocation || item.zone, affectedZone: item.affectedOperationalZone, color, isInternational: item.isInternational };
          }),
        ];
        const nextReports = [...(payload?.reports || []), ...resourceReports];
        setZones(nextZones);
        setReports(nextReports);
        setStatus(nextZones.length || nextReports.length ? "success" : "empty");
      })
      .catch(() => {
        setZones([]);
        setReports([]);
        setStatus("error");
      });
  }, [includeInternational]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Mapa en vivo" subtitle="Zonas afectadas, hospitales, refugios, centros y reportes publicos reales." />
      <PublicAccessNotice text="No necesitas crear cuenta para ver el mapa publico y ubicar ayuda cercana." />
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
            {[
              { id: "affected_zones", label: "Zonas afectadas", status: `${zones.length} reales` },
              { id: "incident_markers", label: "Reportes e incidentes", status: `${reports.filter((item) => !["Hospital", "Refugio"].includes(item.type)).length} reales` },
              { id: "shelters_hospitals", label: "Refugios, hospitales y centros", status: `${reports.filter((item) => ["Hospital", "Refugio"].includes(item.type) || item.type?.includes("center")).length} reales` },
            ].map((layer) => (
              <label key={layer.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 text-sm">
                <input type="checkbox" defaultChecked={layer.visible} />
                <span className="font-semibold flex-1">{layer.label}</span>
                <span className="text-xs text-slate-500">{layer.status}</span>
              </label>
            ))}
            <label className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={includeInternational}
                onChange={(e) => setIncludeInternational(e.target.checked)}
              />
              <span className="font-semibold flex-1">Centros internacionales</span>
              <span className="text-xs text-amber-600 font-medium">{internationalCount} diaspora</span>
            </label>
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
    </div>
  );
}
