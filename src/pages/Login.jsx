import { Building2, ShieldCheck } from "lucide-react";
import SectionTitle from "../components/SectionTitle";

export default function Login() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <SectionTitle
        title="Acceso institucional"
        subtitle="Acceso para ONG, hospitales, refugios, rescatistas, gobierno y administradores."
      />
      <div className="card p-6 space-y-4">
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-blue-800 text-sm">
          Las victimas, familiares y ciudadanos no necesitan iniciar sesion para reportar emergencias, informar que estan a salvo o buscar familiares.
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <input className="input" placeholder="Correo institucional" />
          <input className="input" type="password" placeholder="Contrasena" />
        </div>
        <button className="btn bg-navy text-white w-full flex items-center justify-center gap-2">
          <ShieldCheck size={20} />
          Entrar a coordinacion segura
        </button>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-2xl bg-slate-50 p-4">
            <Building2 className="text-blue-600 mb-2" />
            <p className="font-bold">Instituciones verificadas</p>
            <p className="text-slate-500">ONG, hospitales, refugios, rescatistas, gobierno, auditores y administradores.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <ShieldCheck className="text-green-600 mb-2" />
            <p className="font-bold">Datos sensibles protegidos</p>
            <p className="text-slate-500">El acceso institucional queda sujeto a roles, permisos y auditoria.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
