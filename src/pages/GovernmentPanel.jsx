import { useEffect, useState } from "react";
import { Download, Hospital, Siren, Users } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import { affectedZones } from "../data/affectedZones";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

export default function GovernmentPanel() {
  const [stats, setStats] = useState({});
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    publicApi.getDashboard()
      .then((payload) => {
        setStats(payload?.stats || {});
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle title="Panel gobierno" subtitle="Indicadores consolidados para coordinacion oficial y exportacion de reportes." action={<button className="btn bg-navy text-white flex gap-2 items-center"><Download size={18} /> Exportar reporte</button>} />
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Desaparecidos" value={(stats.missingPeople || 0).toLocaleString()} color="orange" icon={<Users />} />
        <StatCard title="Emergencias activas" value={(stats.activeEmergencies || 0).toLocaleString()} color="red" icon={<Siren />} />
        <StatCard title="Hospitalizados" value={(stats.hospitalizedPeople || 0).toLocaleString()} color="blue" icon={<Hospital />} />
        <StatCard title="Rescatados" value={(stats.rescuedPeople || 0).toLocaleString()} color="green" icon={<Users />} />
        <StatCard title="A salvo" value={(stats.safePeople || 0).toLocaleString()} color="blue" icon={<Users />} />
        <StatCard title="Centros activos" value={(stats.activeCenters || 0).toLocaleString()} color="purple" icon={<Hospital />} />
        <StatCard title="Reportes pendientes" value={(stats.pendingReports || 0).toLocaleString()} color="orange" icon={<Siren />} />
        <StatCard title="Incidentes criticos" value={(stats.criticalIncidents || 0).toLocaleString()} color="red" icon={<Siren />} />
      </div>
      <div className="card p-5 space-y-3">
        <h2 className="font-black">Zonas oficiales afectadas</h2>
        {affectedZones.length ? (
          affectedZones.map((zone) => <p key={zone.id} className="p-3 rounded-xl bg-slate-50 text-sm">{zone.sector}: {zone.afectaciones.join(", ")}</p>)
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">{noApprovedDataMessage}</div>
        )}
      </div>
    </div>
  );
}
