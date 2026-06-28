import { useState } from "react";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import { friendlyApiError, publicApi } from "../lib/api";

const initialForm = {
  name: "",
  approximateAge: "",
  sex: "",
  state: "",
  municipality: "",
  publicLocation: "",
  currentPlace: "",
  conditionSummary: "",
  observations: "",
  reporterName: "",
  contactPrivate: "",
  source: "",
};

export default function RegisterRescued() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");

    try {
      await publicApi.createRescuedReport({
        ...form,
        approximateAge: form.approximateAge || undefined,
        sex: form.sex || undefined,
        state: form.state || undefined,
        municipality: form.municipality || undefined,
        currentPlace: form.currentPlace || undefined,
        conditionSummary: form.conditionSummary || undefined,
        observations: form.observations || undefined,
        reporterName: form.reporterName || undefined,
        contactPrivate: form.contactPrivate || undefined,
        source: form.source || undefined,
      });
      setStatus("success");
      setMessage("Registro enviado para revision.");
      setForm(initialForm);
    } catch (error) {
      setStatus("error");
      setMessage(friendlyApiError(error));
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionTitle title="Registrar rescatado" subtitle="Registro publico seguro para dejar informacion pendiente de revision institucional." />
      <PublicAccessNotice text="No necesitas crear cuenta para reportar una persona rescatada. El registro no se publica hasta ser revisado." />
      <form onSubmit={handleSubmit} className="card p-4 sm:p-6 grid md:grid-cols-2 gap-3 sm:gap-4">
        <input className="input" name="name" value={form.name} onChange={updateField} placeholder="Nombre" required />
        <input className="input" name="approximateAge" value={form.approximateAge} onChange={updateField} placeholder="Edad aproximada" />
        <select className="input" name="sex" value={form.sex} onChange={updateField}>
          <option value="">Sexo</option>
          <option>Femenino</option>
          <option>Masculino</option>
          <option>No especificado</option>
        </select>
        <input className="input" name="state" value={form.state} onChange={updateField} placeholder="Estado" />
        <input className="input" name="municipality" value={form.municipality} onChange={updateField} placeholder="Municipio" />
        <input className="input" name="publicLocation" value={form.publicLocation} onChange={updateField} placeholder="Zona publica" required />
        <input className="input md:col-span-2" name="currentPlace" value={form.currentPlace} onChange={updateField} placeholder="Hospital/refugio/centro donde esta" />
        <input className="input" name="conditionSummary" value={form.conditionSummary} onChange={updateField} placeholder="Condicion general" />
        <input className="input" name="source" value={form.source} onChange={updateField} placeholder="Fuente" />
        <input className="input" name="reporterName" value={form.reporterName} onChange={updateField} placeholder="Nombre de quien reporta" />
        <input className="input" name="contactPrivate" value={form.contactPrivate} onChange={updateField} placeholder="Telefono/contacto privado" />
        <textarea className="input md:col-span-2 min-h-28" name="observations" value={form.observations} onChange={updateField} placeholder="Observaciones" />
        <div className="md:col-span-2 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm font-semibold text-blue-800">
          Telefono, contacto privado, condicion detallada y observaciones quedan restringidos para revision institucional.
        </div>
        {message && <div className={`md:col-span-2 rounded-2xl p-4 text-sm font-semibold ${status === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{message}</div>}
        <button disabled={status === "loading"} className="btn bg-rescueGreen text-white md:col-span-2 disabled:opacity-60">
          {status === "loading" ? "Enviando..." : "Registrar rescatado"}
        </button>
      </form>
    </div>
  );
}
