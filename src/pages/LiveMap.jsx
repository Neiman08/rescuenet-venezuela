import { useEffect, useState } from "react";
import SectionTitle from "../components/SectionTitle";
import MapPreview from "../components/MapPreview";
import PublicAccessNotice from "../components/PublicAccessNotice";
import StatusBadge from "../components/StatusBadge";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

const VZ_STATES = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar",
  "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón",
  "Guárico", "La Guaira", "Lara", "Mérida", "Miranda", "Monagas",
  "Nueva Esparta", "Portuguesa", "Sucre", "Táchira", "Trujillo",
  "Yaracuy", "Zulia",
];

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
  const [selectedState, setSelectedState] = useState("");
  const [includeInternational, setIncludeInternational] = useState(false);
  const [internationalCount, setInternationalCount] = useState(0);

  useEffect(() => {
    setStatus("loading");
    publicApi.getMap({ includeInternational: selectedState ? false : includeInternational, state: selectedState })
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
  }, [includeInternational, selectedState]);

  const centerCount = reports.filter((r) => !["Hospital", "Refugio"].includes(r.type)).length;
  const resourceCount = reports.filter((r) => ["Hospital", "Refugio"].includes(r.type)).length;

  return (
    <div className="space-y-6">
      <SectionTitle title="Mapa en vivo" subtitle="Zonas afectadas, hospitales, refugios, centros y reportes publicos reales." />
      <PublicAccessNotice text="No necesitas crear cuenta para ver el mapa publico y ubicar ayuda cercana." />

      {/* 1. Mapa — primero */}
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {status === "empty" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>}
      <section className="card p-4 h-[520px]">
        <MapPreview zonesData={zones} reports={reports} />
      </section>

      {/* 2. Filtros — debajo del mapa */}
      <div className="card p-5 space-y-4">
        <h2 className="font-black text-lg">Filtros</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Estado</label>
            <select
              className="input w-full"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {VZ_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Tipo</label>
            <select className="input w-full">
              <option>Todos los reportes</option>
              <option>Emergencias criticas</option>
              <option>Refugios</option>
              <option>Hospitales</option>
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Prioridad</label>
            <select className="input w-full">
              <option>Todas las prioridades</option>
              <option>Critica</option>
              <option>Alta</option>
              <option>Media</option>
            </select>
          </div>
        </div>

        {/* Capas GIS + toggle internacional en misma fila */}
        <div className="flex flex-wrap gap-2 items-center pt-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Capas:</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-xs font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Zonas afectadas · {zones.length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-xs font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Reportes · {centerCount}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-xs font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Refugios y hospitales · {resourceCount}
          </span>

          <label className={`ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-opacity ${selectedState ? "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed" : "bg-amber-50 border-amber-200 cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={!selectedState && includeInternational}
              disabled={!!selectedState}
              onChange={(e) => { if (!selectedState) setIncludeInternational(e.target.checked); }}
            />
            <span>Centros internacionales</span>
            <span className={selectedState ? "text-slate-400" : "text-amber-600"}>
              {selectedState ? "(selecciona todos)" : `${internationalCount} diaspora`}
            </span>
          </label>
        </div>
      </div>

      {/* Zonas afectadas — strip horizontal compacto */}
      {zones.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {zones.map((zone) => (
            <div key={zone.id} className="flex-none card p-3 min-w-[200px]">
              <div className="flex justify-between gap-2 items-center">
                <strong className="text-sm">{zone.sector}</strong>
                <StatusBadge status={zone.nivel || zone.level} />
              </div>
              <p className="text-xs text-slate-500 mt-1">{zone.municipio || zone.municipality}, {zone.estado || zone.state}</p>
            </div>
          ))}
        </div>
      )}

      {/* 3. Resultados — listado debajo */}
      {reports.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {reports.map((report) => (
            <div key={report.id} className="card p-4">
              <p className="font-black text-sm">{report.type}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{report.zone || report.affectedZone?.sector}</p>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-2xl font-black">{report.count || report.peopleAffected || 1}</span>
                <StatusBadge status={report.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
