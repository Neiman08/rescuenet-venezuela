import { useEffect, useState } from "react";
import { Building2, Car, Droplet, HeartPulse, Home, Pill, Siren, UserRound, Utensils } from "lucide-react";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import { friendlyApiError, publicApi } from "../lib/api";
import { usePublicAffectedZones, zoneLabel } from "../hooks/usePublicAffectedZones";

const icons = [Siren, HeartPulse, UserRound, Droplet, Utensils, Pill, Home, Building2, Car];
const emergencyTypes = [
  { id: "missing_person", label: "Persona desaparecida" },
  { id: "safe_person", label: "Persona localizada" },
  { id: "hospitalized_person", label: "Hospitalizado" },
  { id: "rescued_person", label: "Rescatado" },
  { id: "collapsed_building", label: "Edificio colapsado" },
  { id: "trapped_person", label: "Persona atrapada" },
  { id: "medical_need", label: "Necesidad medica" },
  { id: "water_need", label: "Falta de agua" },
  { id: "food_need", label: "Falta de alimentos" },
  { id: "collection_center", label: "Centro de acopio" },
  { id: "shelter", label: "Refugio" },
  { id: "closed_road", label: "Carretera cerrada" },
];

export default function ReportEmergency() {
  const { zones, status: zonesStatus, ready: zonesReady } = usePublicAffectedZones();
  const [selectedType, setSelectedType] = useState(emergencyTypes[0].label);
  const [form, setForm] = useState({
    reporterName: "",
    phone: "",
    affectedZoneId: "",
    publicLocation: "",
    peopleAffected: "1",
    description: "",
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
      setMessage("No pudimos cargar zonas oficiales. Intenta de nuevo antes de enviar el reporte.");
      return;
    }
    setStatus("loading");
    setMessage("");

    try {
      const response = await publicApi.createEmergency({
        affectedZoneId: form.affectedZoneId,
        type: selectedType,
        description: `${form.description}\nReporta: ${form.reporterName || "Anonimo"}\nTelefono: ${form.phone || "No indicado"}`,
        peopleAffected: Number(form.peopleAffected) || 0,
        publicLocation: form.publicLocation,
      });
      setStatus("success");
      setMessage(`Reporte recibido. Codigo: ${response?.data?.code || "pendiente"}. Equipos de coordinacion lo revisaran.`);
      setForm((current) => ({ ...current, publicLocation: "", description: "", peopleAffected: "1" }));
    } catch (error) {
      setStatus("error");
      setMessage(friendlyApiError(error));
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionTitle title="Reportar emergencia" subtitle="Este reporte sera enviado a equipos de rescate y centros de coordinacion." />
      <PublicAccessNotice />
      <div className="card p-6">
        <h2 className="font-black text-lg mb-4">Tipo de emergencia</h2>
        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {emergencyTypes.map((type, i) => {
            const Icon = icons[i] || Siren;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.label)}
                className={`p-5 rounded-2xl border text-center ${selectedType === type.label ? "border-red-500 bg-red-50" : "border-slate-200 hover:border-red-400 hover:bg-red-50"}`}
              >
                <Icon className="mx-auto text-red-600 mb-3" />
                <span className="font-bold text-sm">{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 grid md:grid-cols-2 gap-4">
        <input className="input" name="reporterName" value={form.reporterName} onChange={updateField} placeholder="Nombre de quien reporta" />
        <input className="input" name="phone" value={form.phone} onChange={updateField} placeholder="Telefono" />
        <select className="input" name="affectedZoneId" value={form.affectedZoneId} onChange={updateField} required>
          <option value="">Seleccionar zona afectada</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{zoneLabel(z)}</option>)}
        </select>
        <input className="input" name="publicLocation" value={form.publicLocation} onChange={updateField} placeholder="Zona o referencia general" required />
        <input className="input" name="peopleAffected" value={form.peopleAffected} onChange={updateField} placeholder="Numero de personas afectadas" />
        <input className="input" type="file" />
        <textarea className="input md:col-span-2 min-h-32" name="description" value={form.description} onChange={updateField} placeholder="Descripcion de la emergencia" required />
        {zonesStatus === "loading" && <div className="md:col-span-2 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">Cargando zonas oficiales...</div>}
        {zonesStatus === "error" && <div className="md:col-span-2 rounded-2xl bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">No se pudieron cargar zonas oficiales desde el backend. El envio queda pausado para evitar errores.</div>}
        {message && <div className={`md:col-span-2 rounded-2xl p-4 text-sm font-semibold ${status === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{message}</div>}
        <button disabled={status === "loading" || !zonesReady} className="btn bg-rescueRed text-white md:col-span-2 disabled:opacity-60">
          {status === "loading" ? "Enviando..." : "Enviar reporte urgente"}
        </button>
      </form>
    </div>
  );
}
