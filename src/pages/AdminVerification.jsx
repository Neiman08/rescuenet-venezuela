import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import { auditLogs } from "../data/mockData";
import { roleCatalog } from "../data/roles";
import { permissions, rolePermissions } from "../security/accessControl";

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

const securityControls = [
  "Menores: fotos y ubicacion exacta protegidas",
  "Documentos: nunca visibles al publico",
  "Datos medicos: solo resumen publico",
  "Coordenadas: solo rescatistas, gobierno y admin",
  "Accesos sensibles: audit_logs obligatorio",
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
            {roleCatalog.map((role) => <span key={role.id} className="badge bg-slate-100 text-slate-700">{role.label}</span>)}
          </div>
        </div>
        <DataTable columns={[
          { key: "time", label: "Fecha" },
          { key: "actor", label: "Actor" },
          { key: "action", label: "Accion" },
          { key: "level", label: "Riesgo" },
        ]} rows={auditLogs} />
      </div>
      <div className="card p-5">
        <h2 className="font-black mb-4">Matriz de acceso operativo</h2>
        <DataTable
          columns={[
            { key: "role", label: "Rol" },
            { key: "group", label: "Grupo" },
            { key: "clearance", label: "Nivel" },
            { key: "permissions", label: "Permisos" },
          ]}
          rows={roleCatalog.map((role) => ({
            id: role.id,
            role: role.label,
            group: role.group,
            clearance: role.clearance,
            permissions: (rolePermissions[role.id] || []).length,
          }))}
        />
        <p className="text-xs text-slate-500 mt-3">
          {Object.keys(permissions).length} permisos definidos para futura aplicacion server-side, auditoria y control de acceso por rol.
        </p>
      </div>
      <div className="card p-5">
        <h2 className="font-black mb-4">Controles de proteccion de datos</h2>
        <div className="grid md:grid-cols-5 gap-3">
          {securityControls.map((control) => (
            <div key={control} className="p-4 rounded-2xl bg-slate-50 text-sm font-semibold">{control}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
