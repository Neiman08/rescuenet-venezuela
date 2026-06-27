import { Download, Hospital, Siren, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import { affectedZones } from "../data/affectedZones";
import { chartByZone, stats } from "../data/mockData";

export default function GovernmentPanel() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Panel gobierno" subtitle="Indicadores consolidados para coordinacion oficial y exportacion de reportes." action={<button className="btn bg-navy text-white flex gap-2 items-center"><Download size={18} /> Exportar reporte</button>} />
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Total afectados" value="18,420" color="orange" icon={<Users />} />
        <StatCard title="Emergencias activas" value={stats.activeEmergencies.toLocaleString()} color="red" icon={<Siren />} />
        <StatCard title="Fallecidos confirmados" value={stats.confirmedDeaths} color="red" icon={<Users />} />
        <StatCard title="Hospitales saturados" value="7" color="purple" icon={<Hospital />} />
        <StatCard title="Desaparecidos" value={stats.missingPeople} color="orange" icon={<Users />} />
        <StatCard title="Rescatados" value={stats.rescuedPeople.toLocaleString()} color="green" icon={<Users />} />
        <StatCard title="A salvo" value={stats.safePeople.toLocaleString()} color="blue" icon={<Users />} />
        <StatCard title="Recursos desplegados" value="428" color="blue" icon={<Siren />} />
      </div>
      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
        <div className="card p-5 h-96">
          <h2 className="font-black mb-4">Emergencias por zona</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartByZone}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="zone" /><YAxis /><Tooltip /><Bar dataKey="emergencias" fill="#ef2b2d" /></BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5 space-y-3">
          <h2 className="font-black">Zonas oficiales</h2>
          {affectedZones.map((zone) => <p key={zone.id} className="p-3 rounded-xl bg-slate-50 text-sm">{zone.sector}: {zone.afectaciones.join(", ")}</p>)}
        </div>
      </div>
    </div>
  );
}
