import { Lock } from "lucide-react";

export default function SensitiveField({ label, value, allowedRoles = "Rescatistas, gobierno y administradores", revealed = false }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase text-slate-400 font-bold">{label}</p>
        {!revealed && <Lock size={15} className="text-slate-400" />}
      </div>
      <p className="font-semibold mt-1">{revealed ? value : "Informacion protegida"}</p>
      {!revealed && <p className="text-xs text-slate-500 mt-1">Visible solo para {allowedRoles}.</p>}
    </div>
  );
}
