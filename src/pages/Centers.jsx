import { useEffect, useState } from "react";
import { PlusCircle } from "lucide-react";
import DataTable from "../components/DataTable";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { friendlyApiError, publicApi } from "../lib/api";

const initialCenterForm = {
  recordType: "collection_center",
  name: "",
  organization: "",
  country: "Venezuela",
  state: "",
  municipality: "",
  city: "",
  publicLocation: "",
  addressPrivate: "",
  contactPrivate: "",
  operatingHours: "",
  acceptedItems: "",
  capacity: "",
  occupied: "",
  operationalStatus: "PENDIENTE_VERIFICACION",
  observations: "",
};

export default function Centers() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");
  const [filters, setFilters] = useState({ country: "", state: "", municipality: "", type: "", operationalStatus: "", accepts: "" });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialCenterForm);
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    publicApi.getHelpCenters()
      .then((payload) => {
        const nextRows = [
          ...(payload.hospitals || []).map((item) => ({ ...item, type: "hospital", labelType: "Hospital", zone: item.affectedZone?.sector || "Zona no indicada", state: item.affectedZone?.state, municipality: item.affectedZone?.municipality, operationalStatus: item.status })),
          ...(payload.shelters || []).map((item) => ({ ...item, type: "shelter", labelType: "Refugio", zone: item.affectedZone?.sector || "Zona no indicada", state: item.affectedZone?.state, municipality: item.affectedZone?.municipality, operationalStatus: item.status })),
          ...(payload.imported || []).map((item) => ({ ...item, country: item.country, type: item.recordType, labelType: labelForType(item.recordType), zone: item.publicLocation || item.zone || "Zona no indicada", capacity: item.capacity || 0, occupied: item.occupied || 0, operationalStatus: item.operationalStatus })),
        ];
        if (nextRows.length) {
          setRows(nextRows);
          setStatus("success");
        } else {
          setRows([]);
          setStatus("empty");
        }
      })
      .catch(() => {
        setRows([]);
        setStatus("error");
      });
  }, []);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitCenter(event) {
    event.preventDefault();
    if (submitStatus === "loading") return;
    setSubmitStatus("loading");
    setSubmitMessage("");
    try {
      await publicApi.createHelpCenter({
        ...form,
        acceptedItems: form.acceptedItems.split(",").map((item) => item.trim()).filter(Boolean),
        capacity: form.capacity ? Number(form.capacity) : undefined,
        occupied: form.occupied ? Number(form.occupied) : undefined,
      });
      setSubmitStatus("success");
      setSubmitMessage("Centro recibido. Queda pendiente de revision institucional antes de publicarse.");
      setForm(initialCenterForm);
    } catch (error) {
      setSubmitStatus("error");
      setSubmitMessage(friendlyApiError(error));
    }
  }

  const countries = [...new Set(rows.map((row) => row.country).filter(Boolean))];
  const states = [...new Set(rows.map((row) => row.state).filter(Boolean))];
  const municipalities = [...new Set(rows.map((row) => row.municipality).filter(Boolean))];
  const types = [...new Set(rows.map((row) => row.type).filter(Boolean))];
  const operationalStatuses = [...new Set(rows.map((row) => row.operationalStatus || row.status).filter(Boolean))];
  const filteredRows = rows.filter((row) => {
    const itemText = (row.acceptedItems || []).join(" ").toLowerCase();
    return (!filters.country || row.country === filters.country)
      && (!filters.state || row.state === filters.state)
      && (!filters.municipality || row.municipality === filters.municipality)
      && (!filters.type || row.type === filters.type || itemText.includes(filters.type.toLowerCase()))
      && (!filters.operationalStatus || (row.operationalStatus || row.status) === filters.operationalStatus)
      && (!filters.accepts || itemText.includes(filters.accepts));
  });
  const groupedRows = [
    ["Hospitales cercanos a la tragedia", filteredRows.filter((row) => row.operationalType === "hospital_near_disaster" || row.type === "hospital")],
    ["Refugios", filteredRows.filter((row) => row.operationalType === "shelter" || row.type === "shelter")],
    ["Centros de acopio", filteredRows.filter((row) => row.operationalType === "collection_center" || row.type === "collection_center")],
    ["Otros puntos de ayuda", filteredRows.filter((row) => !["hospital_near_disaster", "hospital", "shelter", "collection_center"].includes(row.operationalType || row.type))],
  ].filter(([, items]) => items.length);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Centros de ayuda"
        subtitle="Refugios, hospitales y centros de acopio vinculados a zonas afectadas."
        action={<button className="btn bg-rescueBlue text-white flex items-center gap-2" onClick={() => setShowForm((value) => !value)}><PlusCircle size={18} /> Registrar centro</button>}
      />
      <PublicAccessNotice text="No necesitas crear cuenta para consultar refugios, hospitales o centros de ayuda." />
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {status === "empty" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>}
      {showForm && (
        <form onSubmit={submitCenter} className="card p-5 grid md:grid-cols-3 gap-3">
          <select className="input" name="recordType" value={form.recordType} onChange={updateForm}>
            <option value="hospital">Hospital</option>
            <option value="shelter">Refugio</option>
            <option value="collection_center">Centro de acopio</option>
            <option value="medical_point">Punto medico</option>
            <option value="water_point">Agua</option>
            <option value="food_point">Alimentos</option>
            <option value="pet_aid_center">Mascotas</option>
            <option value="logistics_center">Logistica</option>
          </select>
          <input className="input" name="name" value={form.name} onChange={updateForm} placeholder="Nombre" required />
          <input className="input" name="organization" value={form.organization} onChange={updateForm} placeholder="Organizacion" />
          <input className="input" name="country" value={form.country} onChange={updateForm} placeholder="Pais" />
          <input className="input" name="state" value={form.state} onChange={updateForm} placeholder="Estado" />
          <input className="input" name="municipality" value={form.municipality} onChange={updateForm} placeholder="Municipio" />
          <input className="input" name="city" value={form.city} onChange={updateForm} placeholder="Ciudad" />
          <input className="input" name="publicLocation" value={form.publicLocation} onChange={updateForm} placeholder="Ubicacion publica" required />
          <input className="input" name="operatingHours" value={form.operatingHours} onChange={updateForm} placeholder="Horarios" />
          <input className="input" name="acceptedItems" value={form.acceptedItems} onChange={updateForm} placeholder="Articulos aceptados, separados por coma" />
          <input className="input" name="capacity" value={form.capacity} onChange={updateForm} placeholder="Capacidad" />
          <input className="input" name="occupied" value={form.occupied} onChange={updateForm} placeholder="Ocupados" />
          <input className="input md:col-span-2" name="addressPrivate" value={form.addressPrivate} onChange={updateForm} placeholder="Direccion exacta privada" />
          <input className="input" name="contactPrivate" value={form.contactPrivate} onChange={updateForm} placeholder="Contacto privado" />
          <textarea className="input md:col-span-3 min-h-24" name="observations" value={form.observations} onChange={updateForm} placeholder="Observaciones operativas publicas, sin datos sensibles" />
          {submitMessage && <div className={`md:col-span-3 rounded-2xl p-4 text-sm font-semibold ${submitStatus === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{submitMessage}</div>}
          <button className="btn bg-navy text-white md:col-span-3" disabled={submitStatus === "loading"}>{submitStatus === "loading" ? "Registrando..." : "Registrar y dejar pendiente de revision"}</button>
        </form>
      )}
      <div className="card p-5 grid md:grid-cols-6 gap-3">
        <select className="input" name="country" value={filters.country} onChange={updateFilter}>
          <option value="">Todos los paises</option>
          {countries.map((country) => <option key={country} value={country}>{country}</option>)}
        </select>
        <select className="input" name="state" value={filters.state} onChange={updateFilter}>
          <option value="">Todos los estados</option>
          {states.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
        <select className="input" name="municipality" value={filters.municipality} onChange={updateFilter}>
          <option value="">Todos los municipios</option>
          {municipalities.map((municipality) => <option key={municipality} value={municipality}>{municipality}</option>)}
        </select>
        <select className="input" name="type" value={filters.type} onChange={updateFilter}>
          <option value="">Toda la ayuda</option>
          {types.map((type) => <option key={type} value={type}>{labelForType(type)}</option>)}
          <option value="agua">Agua</option>
          <option value="alimentos">Alimentos</option>
          <option value="medicina">Medicinas</option>
        </select>
        <select className="input" name="operationalStatus" value={filters.operationalStatus} onChange={updateFilter}>
          <option value="">Activo/inactivo</option>
          {operationalStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="input" name="accepts" value={filters.accepts} onChange={updateFilter}>
          <option value="">Todos los insumos</option>
          <option value="alimento">Acepta alimentos</option>
          <option value="medicina">Acepta medicinas</option>
          <option value="agua">Acepta agua</option>
          <option value="ropa">Acepta ropa</option>
          <option value="mascota">Acepta mascotas</option>
        </select>
      </div>
      {groupedRows.map(([title, items]) => (
        <section key={title} className="space-y-3">
          <h2 className="font-black text-lg">{title}</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
            {items.map((center) => (
              <div className="card p-5" key={center.id || center.name}>
                <h3 className="font-black">{center.name}</h3>
                <p className="text-sm text-slate-500">{center.labelType || center.type} - {center.zone}</p>
                <p className="text-xs mt-2 font-semibold text-slate-600">{center.affectedOperationalZone?.sector || center.affectedZone?.sector || center.zone} · {center.operationalPriority || center.affectedOperationalZone?.priority || "Zona afectada"}</p>
                {center.acceptedItems?.length ? <p className="text-xs mt-3 font-semibold text-slate-600">Recibe: {center.acceptedItems.join(", ")}</p> : null}
                {center.capacity ? (
                  <>
                    <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rescueBlue" style={{ width: `${Math.round((center.occupied / center.capacity) * 100)}%` }} />
                    </div>
                    <p className="text-xs mt-2">{center.occupied} de {center.capacity}</p>
                  </>
                ) : <p className="text-xs mt-3">{center.operatingHours || center.operationalStatus || "Por verificar"}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}
      <DataTable columns={[
        { key: "name", label: "Centro" },
        { key: "type", label: "Tipo" },
        { key: "zone", label: "Zona" },
        { key: "capacity", label: "Capacidad" },
        { key: "occupied", label: "Ocupados" },
        { key: "status", label: "Estado", badge: true },
      ]} rows={filteredRows.map((row) => ({ ...row, type: row.labelType || labelForType(row.type), status: row.operationalStatus || row.status }))} />
    </div>
  );
}

function labelForType(type) {
  const labels = {
    collection_center: "Centro de acopio",
    shelter: "Refugio",
    hospital: "Hospital",
    help_center: "Centro de ayuda",
    water_point: "Agua",
    food_point: "Comida",
    medical_point: "Medicina",
    volunteer_center: "Voluntariado",
    donation_need: "Necesidad urgente",
    pet_aid_center: "Mascotas",
    logistics_center: "Logistica",
  };
  return labels[type] || type || "Centro";
}
