import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  if (isAuthenticated) {
    navigate(next, { replace: true });
    return null;
  }

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      await login({ email: form.email, password: form.password });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message || "Credenciales invalidas. Verifica tu correo y contrasena.");
      setStatus("error");
    }
  }

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
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
          <input
            className="input"
            type="email"
            name="email"
            value={form.email}
            onChange={updateField}
            placeholder="Correo institucional"
            required
            autoComplete="email"
          />
          <input
            className="input"
            type="password"
            name="password"
            value={form.password}
            onChange={updateField}
            placeholder="Contrasena"
            required
            autoComplete="current-password"
          />
          {error && (
            <div className="md:col-span-2 rounded-2xl bg-red-50 border border-red-100 p-3 text-red-800 text-sm font-semibold">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={status === "loading"}
            className="md:col-span-2 btn bg-navy text-white w-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <ShieldCheck size={20} />
            {status === "loading" ? "Verificando..." : "Entrar a coordinacion segura"}
          </button>
        </form>
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
