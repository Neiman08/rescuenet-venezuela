import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import { friendlyApiError, publicApi } from "../lib/api";
import { usePublicAffectedZones, zoneLabel } from "../hooks/usePublicAffectedZones";

export default function SafeReport() {
  const { zones, status: zonesStatus, ready: zonesReady } = usePublicAffectedZones();
  const [form, setForm] = useState({
    fullName: "",
    documentId: "",
    phone: "",
    affectedZoneId: "",
    currentPlace: "",
    relatives: "",
    message: "",
  });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!form.affectedZoneId && zones[0]?.id) {
      setForm((current) => ({ ...current, affectedZoneId: zones[0].id }));
    }
  }, [form.affectedZoneId, zones]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "loading") return;
    if (!zonesReady) {
      setStatus("error");
      setMessage("No pudimos cargar zonas oficiales. Intenta de nuevo antes de informar tu estado.");
      return;
    }
    setStatus("loading");
    setMessage("");

    try {
      await publicApi.createSafeReport({
        affectedZoneId: form.affectedZoneId,
        fullName: form.fullName,
        phone: form.phone,
        currentPlace: form.currentPlace,
        message: form.message,
      });
      setStatus("success");
      setMessage("Tu estado fue registrado. Tus familiares podran buscarte de forma segura.");
      setForm((current) => ({ ...current, currentPlace: "", relatives: "", message: "" }));
    } catch (error) {
      setStatus("error");
      setMessage(friendlyApiError(error));
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SectionTitle title="Estoy a salvo" subtitle="Registra tu estado para que familiares y coordinadores puedan ubicarte." />
      <PublicAccessNotice text="No necesitas crear cuenta para informar que estas a salvo." />
      <form onSubmit={handleSubmit} className="card p-6 grid md:grid-cols-2 gap-4">
        <input className="input" name="fullName" value={form.fullName} onChange={updateField} placeholder="Nombre completo" required />
        <input className="input" name="documentId" value={form.documentId} onChange={updateField} placeholder="Cedula o identificador opcional" />
        <input className="input" name="phone" value={form.phone} onChange={updateField} placeholder="Telefono de contacto" />
        <select className="input" name="affectedZoneId" value={form.affectedZoneId} onChange={updateField} required>
          <option value="">Seleccionar zona</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{zoneLabel(z)}</option>)}
        </select>
        <input className="input" name="currentPlace" value={form.currentPlace} onChange={updateField} placeholder="Lugar seguro actual o zona general" required />
        <input className="input" name="relatives" value={form.relatives} onChange={updateField} placeholder="Familiares a notificar" />
        <textarea className="input md:col-span-2 min-h-28" name="message" value={form.message} onChange={updateField} placeholder="Mensaje breve para familiares" />
        {zonesStatus === "loading" && <div className="md:col-span-2 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">Cargando zonas oficiales...</div>}
        {zonesStatus === "error" && <div className="md:col-span-2 rounded-2xl bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">No se pudieron cargar zonas oficiales desde el backend. El envio queda pausado para evitar errores.</div>}
        {message && <div className={`md:col-span-2 rounded-2xl p-4 text-sm font-semibold ${status === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{message}</div>}
        <button disabled={status === "loading" || !zonesReady} className="btn bg-rescueGreen text-white md:col-span-2 flex items-center justify-center gap-2 disabled:opacity-60">
          <CheckCircle size={20} /> {status === "loading" ? "Enviando..." : "Informar a mi familia"}
        </button>
      </form>
    </div>
  );
}
