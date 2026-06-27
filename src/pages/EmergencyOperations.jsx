import { AlertTriangle, Radio, ShieldCheck, WifiOff } from "lucide-react";
import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import { affectedZones } from "../data/affectedZones";
import { dispatchStatuses, incidentQueue, incidentSeverity, operationalZones, responderTeams } from "../data/emergencyOperations";

function SeverityBadge({ severity }) {
  const config = incidentSeverity[severity] || incidentSeverity.low;
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}

function zoneName(zoneId) {
  const zone = affectedZones.find((item) => item.id === zoneId);
  return zone ? `${zone.sector}, ${zone.estado}` : "Zona no registrada";
}

export default function EmergencyOperations() {
  const criticalCount = incidentQueue.filter((incident) => incident.severity === "critical").length;
  const atRisk = incidentQueue.reduce((total, incident) => total + incident.peopleAtRisk, 0);
  const assigned = incidentQueue.filter((incident) => ["assigned", "enroute", "onsite"].includes(incident.status)).length;

  return (
    <div className="space-y-6">
      <SectionTitle title="Centro de operaciones" subtitle="Triaje, asignacion y seguimiento de incidentes simulados para coordinacion de emergencia." />

      <div className="card p-4 bg-amber-50 border-amber-100 flex flex-col md:flex-row md:items-center gap-3">
        <WifiOff className="text-amber-700" />
        <div>
          <p className="font-black text-amber-800">Modo resiliente preparado</p>
          <p className="text-sm text-amber-700">La interfaz prioriza acciones rapidas y puede evolucionar a sincronizacion diferida para conectividad limitada.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Incidentes abiertos" value={incidentQueue.length} color="red" icon={<AlertTriangle />} />
        <StatCard title="Criticos" value={criticalCount} color="red" icon={<Radio />} />
        <StatCard title="Personas en riesgo" value={atRisk.toLocaleString()} color="orange" icon={<AlertTriangle />} />
        <StatCard title="Asignados" value={`${assigned}/${incidentQueue.length}`} color="green" icon={<ShieldCheck />} />
      </div>

      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
        <div className="card p-5">
          <h2 className="font-black mb-4">Cola de triaje</h2>
          <DataTable
            columns={[
              { key: "id", label: "Incidente" },
              { key: "type", label: "Tipo" },
              { key: "severity", label: "Severidad", render: (row) => <SeverityBadge severity={row.severity} /> },
              { key: "status", label: "Estado", render: (row) => dispatchStatuses[row.status] },
              { key: "zone", label: "Zona", render: (row) => zoneName(row.zoneId) },
              { key: "slaMinutes", label: "SLA", render: (row) => `${row.slaMinutes} min` },
              { key: "assignedTeam", label: "Equipo" },
            ]}
            rows={incidentQueue}
          />
        </div>

        <aside className="card p-5 space-y-4">
          <h2 className="font-black">Acciones rapidas</h2>
          {["Despachar USAR", "Solicitar ambulancia", "Abrir refugio", "Escalar a gobierno", "Enviar alerta publica"].map((action) => (
            <button key={action} className="btn bg-navy text-white w-full text-left">{action}</button>
          ))}
        </aside>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-black mb-4">Equipos de respuesta</h2>
          <DataTable
            columns={[
              { key: "id", label: "ID" },
              { key: "name", label: "Equipo" },
              { key: "type", label: "Tipo" },
              { key: "zone", label: "Zona", render: (row) => zoneName(row.zoneId) },
              { key: "members", label: "Miembros" },
              { key: "status", label: "Estado" },
              { key: "eta", label: "ETA" },
            ]}
            rows={responderTeams}
          />
        </div>

        <div className="card p-5">
          <h2 className="font-black mb-4">Presion por zona</h2>
          <div className="space-y-3">
            {operationalZones.map((zone) => (
              <div key={zone.id} className="p-4 rounded-2xl bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black">{zone.sector}</p>
                    <p className="text-xs text-slate-500">{zone.municipio}, {zone.estado}</p>
                  </div>
                  <span className="badge bg-blue-100 text-blue-700">{zone.verificacion}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                  <span>Incidentes: <strong>{zone.openIncidents}</strong></span>
                  <span>Equipos: <strong>{zone.teams}</strong></span>
                  <span>Radio: <strong>{zone.radioKm} km</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
