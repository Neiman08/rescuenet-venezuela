import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import { demoDataEnabled, noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { centers } from "../data/mockData";
import { publicApi } from "../lib/api";

export default function Centers() {
  const [rows, setRows] = useState(demoDataEnabled ? centers : []);
  const [status, setStatus] = useState("loading");
  const [filters, setFilters] = useState({ state: "", municipality: "", type: "", operationalStatus: "" });

  useEffect(() => {
    publicApi.getHelpCenters()
      .then((payload) => {
        const nextRows = [
          ...(payload.hospitals || []).map((item) => ({ ...item, type: "hospital", labelType: "Hospital", zone: item.affectedZone?.sector || "Zona no indicada", state: item.affectedZone?.state, municipality: item.affectedZone?.municipality, operationalStatus: item.status })),
          ...(payload.shelters || []).map((item) => ({ ...item, type: "shelter", labelType: "Refugio", zone: item.affectedZone?.sector || "Zona no indicada", state: item.affectedZone?.state, municipality: item.affectedZone?.municipality, operationalStatus: item.status })),
          ...(payload.imported || []).map((item) => ({ ...item, type: item.recordType, labelType: labelForType(item.recordType), zone: item.publicLocation || item.zone || "Zona no indicada", capacity: item.capacity || 0, occupied: item.occupied || 0, operationalStatus: item.operationalStatus })),
        ];
        if (nextRows.length) {
          setRows(nextRows);
          setStatus("success");
        } else {
          setRows(demoDataEnabled ? centers : []);
          setStatus(demoDataEnabled ? "fallback" : "empty");
        }
      })
      .catch(() => {
        setRows(demoDataEnabled ? centers : []);
        setStatus(demoDataEnabled ? "fallback" : "error");
      });
  }, []);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  const states = [...new Set(rows.map((row) => row.state).filter(Boolean))];
  const municipalities = [...new Set(rows.map((row) => row.municipality).filter(Boolean))];
  const types = [...new Set(rows.map((row) => row.type).filter(Boolean))];
  const operationalStatuses = [...new Set(rows.map((row) => row.operationalStatus || row.status).filter(Boolean))];
  const filteredRows = rows.filter((row) => {
    const itemText = (row.acceptedItems || []).join(" ").toLowerCase();
    return (!filters.state || row.state === filters.state)
      && (!filters.municipality || row.municipality === filters.municipality)
      && (!filters.type || row.type === filters.type || itemText.includes(filters.type.toLowerCase()))
      && (!filters.operationalStatus || (row.operationalStatus || row.status) === filters.operationalStatus);
  });

  return (
    <div className="space-y-6">
      <SectionTitle title="Centros de ayuda" subtitle="Refugios, hospitales y centros de acopio vinculados a zonas afectadas." />
      <PublicAccessNotice text="No necesitas crear cuenta para consultar refugios, hospitales o centros de ayuda." />
      {status === "fallback" && <div className="rounded-2xl bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">No pudimos conectar con centros publicos del backend. Mostrando datos simulados locales.</div>}
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {status === "empty" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>}
      <div className="card p-5 grid md:grid-cols-4 gap-3">
        <select className="input" name="state" value={filters.state} onChange={updateFilter}>
          <option value="">Todos los estados</option>
          {states.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
        <select className="input" name="municipality" value={filters.municipality} onChange={updateFilter}>
          <option value="">Todos los municipios</option>
          {municipalities.map((municipality) => <option key={municipality} value={municipality}>{municipality}</option>)}
        </select>
        <select className="input" name="type" value={filters.type} onChange={updateFilter}>
          <option value="">Toda la ayuda</option>
          {types.map((type) => <option key={type} value={type}>{labelForType(type)}</option>)}
          <option value="agua">Agua</option>
          <option value="alimentos">Alimentos</option>
          <option value="medicina">Medicinas</option>
        </select>
        <select className="input" name="operationalStatus" value={filters.operationalStatus} onChange={updateFilter}>
          <option value="">Activo/inactivo</option>
          {operationalStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        {filteredRows.map((center) => (
          <div className="card p-5" key={center.name}>
            <h2 className="font-black">{center.name}</h2>
            <p className="text-sm text-slate-500">{center.labelType || center.type} - {center.zone}</p>
            {center.acceptedItems?.length ? <p className="text-xs mt-3 font-semibold text-slate-600">Recibe: {center.acceptedItems.join(", ")}</p> : null}
            {center.capacity ? (
              <>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rescueBlue" style={{ width: `${Math.round((center.occupied / center.capacity) * 100)}%` }} />
                </div>
                <p className="text-xs mt-2">{center.occupied} de {center.capacity}</p>
              </>
            ) : <p className="text-xs mt-3">{center.operatingHours || center.operationalStatus || "Por verificar"}</p>}
          </div>
        ))}
      </div>
      <DataTable columns={[
        { key: "name", label: "Centro" },
        { key: "type", label: "Tipo" },
        { key: "zone", label: "Zona" },
        { key: "capacity", label: "Capacidad" },
        { key: "occupied", label: "Ocupados" },
        { key: "status", label: "Estado", badge: true },
      ]} rows={filteredRows.map((row) => ({ ...row, type: row.labelType || labelForType(row.type), status: row.operationalStatus || row.status }))} />
    </div>
  );
}

function labelForType(type) {
  const labels = {
    collection_center: "Centro de acopio",
    shelter: "Refugio",
    hospital: "Hospital",
    help_center: "Centro de ayuda",
    water_point: "Agua",
    food_point: "Comida",
    medical_point: "Medicina",
    volunteer_center: "Voluntariado",
    donation_need: "Necesidad urgente",
  };
  return labels[type] || type || "Centro";
}
