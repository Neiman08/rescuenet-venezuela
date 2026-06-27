import { useEffect, useState } from "react";
import { AlertTriangle, Radio, ShieldCheck, Users } from "lucide-react";
import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

function normalizeIncident(item) {
  return {
    id: item.code || item.id,
    type: item.type || "Reporte ciudadano",
    severity: item.priority || item.severity || (Number(item.peopleAffected || 0) > 0 ? "CRITICO" : "PENDIENTE"),
    status: item.verificationStatus || item.status || "pending_review",
    publicLocation: item.publicLocation || item.zone || item.affectedZone?.sector || "Zona no indicada",
    peopleAtRisk: item.peopleAffected || 0,
    assigned: item.assignedTeam || "Pendiente",
    createdAt: item.createdAt || item.updatedAt,
  };
}

export default function EmergencyOperations() {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({});
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.allSettled([publicApi.getEmergencies(), publicApi.getDashboard()])
      .then(([emergencies, dashboard]) => {
        const nextIncidents = emergencies.status === "fulfilled" ? (emergencies.value.data || []).map(normalizeIncident) : [];
        setIncidents(nextIncidents);
        setStats(dashboard.status === "fulfilled" ? dashboard.value.stats || {} : {});
        setStatus(emergencies.status === "fulfilled" || dashboard.status === "fulfilled" ? "success" : "error");
      })
      .catch(() => setStatus("error"));
  }, []);

  const critical = incidents.filter((item) => String(item.severity).toLowerCase().includes("critic")).length;
  const peopleAtRisk = incidents.reduce((sum, item) => sum + Number(item.peopleAtRisk || 0), 0);
  const assigned = incidents.filter((item) => item.assigned && item.assigned !== "Pendiente").length;

  return (
    <div className="space-y-6">
      <SectionTitle title="Centro de operaciones" subtitle="Triaje, asignacion y seguimiento de incidentes reales reportados." />
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Incidentes abiertos" value={incidents.length} color="red" icon={<AlertTriangle />} />
        <StatCard title="Criticos" value={critical} color="red" icon={<Radio />} />
        <StatCard title="Personas en riesgo" value={peopleAtRisk.toLocaleString()} color="orange" icon={<Users />} />
        <StatCard title="Asignados" value={`${assigned}/${incidents.length}`} color="green" icon={<ShieldCheck />} />
      </div>

      <div className="card p-5">
        <h2 className="font-black mb-4">Cola de triage</h2>
        {incidents.length ? (
          <DataTable
            columns={[
              { key: "type", label: "Tipo" },
              { key: "severity", label: "Severidad", badge: true },
              { key: "status", label: "Estado", badge: true },
              { key: "publicLocation", label: "Zona publica" },
              { key: "peopleAtRisk", label: "Personas" },
              { key: "assigned", label: "Asignado" },
            ]}
            rows={incidents}
          />
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">{noApprovedDataMessage}</div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-black mb-4">Resumen operativo real</h2>
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <span className="rounded-2xl bg-slate-50 p-4">Desaparecidos: <strong>{stats.missingPeople || 0}</strong></span>
          <span className="rounded-2xl bg-slate-50 p-4">Hospitalizados: <strong>{stats.hospitalizedPeople || 0}</strong></span>
          <span className="rounded-2xl bg-slate-50 p-4">Rescatados: <strong>{stats.rescuedPeople || 0}</strong></span>
          <span className="rounded-2xl bg-slate-50 p-4">Centros activos: <strong>{stats.activeCenters || 0}</strong></span>
        </div>
      </div>
    </div>
  );
}
