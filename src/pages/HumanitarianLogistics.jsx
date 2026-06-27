import { useEffect, useState } from "react";
import { Boxes, ClipboardList, PackageCheck, Truck } from "lucide-react";
import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { friendlyApiError, publicApi } from "../lib/api";

const categories = [
  ["water", "Agua"],
  ["food", "Alimentos"],
  ["medicine", "Medicinas"],
  ["fuel", "Combustible"],
  ["transport", "Transporte"],
  ["generator", "Plantas electricas"],
  ["mattress", "Colchones"],
  ["medical_supply", "Insumos medicos"],
];

const initialForm = {
  itemType: "water",
  requester: "",
  organization: "",
  state: "",
  municipality: "",
  publicLocation: "",
  quantity: "",
  priority: "ALTA",
  notes: "",
  contactPrivate: "",
};

export default function HumanitarianLogistics() {
  const [needs, setNeeds] = useState([]);
  const [status, setStatus] = useState("loading");
  const [form, setForm] = useState(initialForm);
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    publicApi.getHelpCenters()
      .then((payload) => {
        const rows = (payload.imported || [])
          .filter((item) => item.recordType === "donation_need")
          .map((item) => ({
            id: item.id || item.name,
            item: item.itemType || item.name || "Solicitud",
            requester: item.requester || item.organization || "No indicado",
            publicLocation: item.publicLocation || item.zone || "Zona no indicada",
            quantity: item.quantity || item.acceptedItems?.join(", ") || "No indicada",
            priority: item.priority || item.operationalStatus || "Pendiente",
            status: item.verificationStatus || item.operationalStatus || "Aprobado",
          }));
        setNeeds(rows);
        setStatus(rows.length ? "success" : "empty");
      })
      .catch(() => setStatus("error"));
  }, []);

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (submitStatus === "loading") return;
    setSubmitStatus("loading");
    setMessage("");
    try {
      await publicApi.createLogisticsRequest(form);
      setSubmitStatus("success");
      setMessage("Solicitud recibida. Queda pendiente de revision antes de publicarse.");
      setForm(initialForm);
    } catch (error) {
      setSubmitStatus("error");
      setMessage(friendlyApiError(error));
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Logistica humanitaria" subtitle="Solicitudes, inventario y necesidades reales pendientes de verificacion." />
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Solicitudes reales" value={needs.length} color="blue" icon={<ClipboardList />} />
        <StatCard title="Inventario registrado" value="0" color="green" icon={<Boxes />} />
        <StatCard title="Entregas activas" value="0" color="purple" icon={<Truck />} />
        <StatCard title="Pendientes revision" value={needs.length ? 0 : 0} color="orange" icon={<PackageCheck />} />
      </div>

      <form onSubmit={submitRequest} className="card p-5 grid md:grid-cols-3 gap-3">
        <select className="input" name="itemType" value={form.itemType} onChange={updateForm}>
          {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input className="input" name="requester" value={form.requester} onChange={updateForm} placeholder="Solicitante" required />
        <input className="input" name="organization" value={form.organization} onChange={updateForm} placeholder="Organizacion" />
        <input className="input" name="state" value={form.state} onChange={updateForm} placeholder="Estado" />
        <input className="input" name="municipality" value={form.municipality} onChange={updateForm} placeholder="Municipio" />
        <input className="input" name="publicLocation" value={form.publicLocation} onChange={updateForm} placeholder="Ubicacion publica" required />
        <input className="input" name="quantity" value={form.quantity} onChange={updateForm} placeholder="Cantidad requerida o disponible" />
        <select className="input" name="priority" value={form.priority} onChange={updateForm}>
          <option value="CRITICA">Critica</option>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Media</option>
          <option value="PENDIENTE">Pendiente</option>
        </select>
        <input className="input" name="contactPrivate" value={form.contactPrivate} onChange={updateForm} placeholder="Contacto privado" />
        <textarea className="input md:col-span-3 min-h-24" name="notes" value={form.notes} onChange={updateForm} placeholder="Notas operativas sin datos medicos sensibles" />
        {message && <div className={`md:col-span-3 rounded-2xl p-4 text-sm font-semibold ${submitStatus === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{message}</div>}
        <button className="btn bg-navy text-white md:col-span-3" disabled={submitStatus === "loading"}>{submitStatus === "loading" ? "Registrando..." : "Registrar solicitud o insumo"}</button>
      </form>

      <div className="card p-5">
        <h2 className="font-black mb-4">Solicitudes publicas aprobadas</h2>
        {needs.length ? (
          <DataTable
            columns={[
              { key: "item", label: "Recurso" },
              { key: "requester", label: "Solicitante" },
              { key: "publicLocation", label: "Zona publica" },
              { key: "quantity", label: "Cantidad" },
              { key: "priority", label: "Prioridad", badge: true },
              { key: "status", label: "Estado", badge: true },
            ]}
            rows={needs}
          />
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">{noApprovedDataMessage}</div>
        )}
      </div>
    </div>
  );
}
