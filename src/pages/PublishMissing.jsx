import { useEffect, useState } from "react";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import { friendlyApiError, publicApi } from "../lib/api";
import { usePublicAffectedZones, zoneLabel } from "../hooks/usePublicAffectedZones";

export default function PublishMissing() {
  const { zones, status: zonesStatus, ready: zonesReady } = usePublicAffectedZones();
  const [form, setForm] = useState({
    fullName: "",
    age: "",
    documentId: "",
    sex: "",
    description: "",
    clothing: "",
    lastSeenPlace: "",
    affectedZoneId: "",
    approximateDate: "",
    reporterName: "",
    contact: "",
    consentPublic: false,
    isMinor: false,
  });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!form.affectedZoneId && zones[0]?.id) {
      setForm((current) => ({ ...current, affectedZoneId: zones[0].id }));
    }
  }, [form.affectedZoneId, zones]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "loading") return;
    if (!zonesReady) {
      setStatus("error");
      setMessage("No pudimos cargar zonas oficiales. Intenta de nuevo antes de publicar la busqueda.");
      return;
    }
    setStatus("loading");
    setMessage("");

    try {
      await publicApi.createMissingReport({
        affectedZoneId: form.affectedZoneId,
        fullName: form.fullName,
        age: form.age ? Number(form.age) : undefined,
        documentId: form.documentId || undefined,
        sex: form.sex || undefined,
        description: `${form.description}\nFecha aproximada: ${form.approximateDate || "No indicada"}\nReporta: ${form.reporterName || "No indicado"}\nContacto: ${form.contact || "No indicado"}`,
        clothing: form.clothing,
        lastSeenPlace: form.lastSeenPlace,
        consentPublic: form.consentPublic,
        isMinor: form.isMinor,
      });
      setStatus("success");
      setMessage("Busqueda publicada de forma segura. El equipo revisara la informacion antes de mostrar datos sensibles.");
      setForm((current) => ({ ...current, description: "", clothing: "", lastSeenPlace: "", approximateDate: "" }));
    } catch (error) {
      setStatus("error");
      setMessage(friendlyApiError(error));
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionTitle title="Publicar busqueda familiar" subtitle="Formulario para reportar personas desaparecidas. La informacion queda pendiente de verificacion antes de publicarse." />
      <PublicAccessNotice text="No necesitas crear cuenta para reportar una persona desaparecida." />
      <form onSubmit={handleSubmit} className="card p-6 grid md:grid-cols-2 gap-4">
        <input className="input" name="fullName" value={form.fullName} onChange={updateField} placeholder="Nombre completo de la persona buscada" required />
        <input className="input" name="age" value={form.age} onChange={updateField} placeholder="Edad" />
        <input className="input" name="documentId" value={form.documentId} onChange={updateField} placeholder="Cedula opcional" />
        <select className="input" name="sex" value={form.sex} onChange={updateField}><option value="">Sexo</option><option>Femenino</option><option>Masculino</option><option>No especificado</option></select>
        <input className="input" type="file" />
        <input className="input" type="file" multiple />
        <textarea className="input md:col-span-2 min-h-24" name="description" value={form.description} onChange={updateField} placeholder="Senas particulares" />
        <input className="input" name="clothing" value={form.clothing} onChange={updateField} placeholder="Ropa que llevaba" />
        <input className="input" name="lastSeenPlace" value={form.lastSeenPlace} onChange={updateField} placeholder="Ultimo lugar donde fue visto" />
        <select className="input" name="affectedZoneId" value={form.affectedZoneId} onChange={updateField} required>
          <option value="">Seleccionar zona</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{zoneLabel(z)}</option>)}
        </select>
        <input className="input" name="approximateDate" value={form.approximateDate} onChange={updateField} placeholder="Fecha y hora aproximada" />
        <input className="input" name="reporterName" value={form.reporterName} onChange={updateField} placeholder="Nombre del familiar que reporta" />
        <input className="input" name="contact" value={form.contact} onChange={updateField} placeholder="Parentesco y telefono" />
        <label className="flex items-center gap-3 text-sm"><input name="isMinor" type="checkbox" checked={form.isMinor} onChange={updateField} /> Es menor de edad</label>
        <label className="md:col-span-2 flex items-center gap-3 text-sm"><input name="consentPublic" type="checkbox" checked={form.consentPublic} onChange={updateField} /> Autorizo busqueda publica con proteccion de documentos y datos sensibles.</label>
        {zonesStatus === "loading" && <div className="md:col-span-2 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">Cargando zonas oficiales...</div>}
        {zonesStatus === "error" && <div className="md:col-span-2 rounded-2xl bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">No se pudieron cargar zonas oficiales desde el backend. El envio queda pausado para evitar errores.</div>}
        {message && <div className={`md:col-span-2 rounded-2xl p-4 text-sm font-semibold ${status === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{message}</div>}
        <button disabled={status === "loading" || !zonesReady} className="btn bg-rescueBlue text-white md:col-span-2 disabled:opacity-60">
          {status === "loading" ? "Enviando..." : "Publicar busqueda"}
        </button>
      </form>
    </div>
  );
}
