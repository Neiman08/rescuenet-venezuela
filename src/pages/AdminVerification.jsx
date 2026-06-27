import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import { auditLogs } from "../data/mockData";
import { roles } from "../data/roles";

const tasks = [
  "Verificar reportes",
  "Aprobar ONG",
  "Bloquear fraude",
  "Revisar denuncias",
  "Validar gastos",
  "Validar reunificaciones",
  "Corregir duplicados",
  "Gestionar zonas afectadas",
  "Gestionar usuarios y roles",
  "Ver logs de auditoria",
];

export default function AdminVerification() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Administracion" subtitle="Centro mock de verificacion, roles, auditoria y control antifraude." />
      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        {tasks.map((task) => <button key={task} className="card p-4 text-left font-bold hover:border-blue-300">{task}</button>)}
      </div>
      <div className="grid xl:grid-cols-[360px_1fr] gap-6">
        <div className="card p-5">
          <h2 className="font-black mb-4">Roles preparados</h2>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => <span key={role} className="badge bg-slate-100 text-slate-700">{role}</span>)}
          </div>
        </div>
        <DataTable columns={[
          { key: "time", label: "Fecha" },
          { key: "actor", label: "Actor" },
          { key: "action", label: "Accion" },
          { key: "level", label: "Riesgo" },
        ]} rows={auditLogs} />
      </div>
    </div>
  );
}
