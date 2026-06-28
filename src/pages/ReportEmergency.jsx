import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Building2, Car, CheckCircle, Droplet,
  HeartPulse, Home, Pill, Siren, UserRound, Users, Utensils,
} from "lucide-react";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import { friendlyApiError, publicApi } from "../lib/api";
import { usePublicAffectedZones, zoneLabel } from "../hooks/usePublicAffectedZones";

const TYPES = [
  { id: "missing_person",      label: "Persona desaparecida",  icon: Users,         group: "person"    },
  { id: "safe_person",         label: "Persona localizada",    icon: CheckCircle,   group: "person"    },
  { id: "hospitalized_person", label: "Hospitalizado/a",       icon: HeartPulse,    group: "person"    },
  { id: "rescued_person",      label: "Rescatado/a",           icon: UserRound,     group: "person"    },
  { id: "deceased_person",     label: "Fallecido/a",           icon: AlertTriangle, group: "person"    },
  { id: "trapped_person",      label: "Persona atrapada",      icon: Siren,         group: "emergency" },
  { id: "collapsed_building",  label: "Edificio colapsado",    icon: Home,          group: "emergency" },
  { id: "closed_road",         label: "Carretera cerrada",     icon: Car,           group: "emergency" },
  { id: "medical_need",        label: "Necesidad medica",      icon: Pill,          group: "emergency" },
  { id: "water_need",          label: "Falta de agua",         icon: Droplet,       group: "emergency" },
  { id: "food_need",           label: "Falta de alimentos",    icon: Utensils,      group: "emergency" },
  { id: "collection_center",   label: "Centro de acopio",      icon: Building2,     group: "center"    },
  { id: "shelter",             label: "Refugio",               icon: Home,          group: "center"    },
];

export default function ReportEmergency() {
  const { zones, status: zonesStatus, ready: zonesReady } = usePublicAffectedZones();
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState({});
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const formRef = useRef(null);

  useEffect(() => {
    if (!form.affectedZoneId && zones[0]?.id) {
      setForm((cur) => ({ ...cur, affectedZoneId: zones[0].id }));
    }
  }, [zones, form.affectedZoneId]);

  function selectType(type) {
    setSelectedType(type);
    setForm({ affectedZoneId: zones[0]?.id || "" });
    setStatus("idle");
    setMessage("");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function update(e) {
    const { name, value, type: t, checked } = e.target;
    setForm((cur) => ({ ...cur, [name]: t === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");

    try {
      const zoneId = form.affectedZoneId || zones[0]?.id;
      const selectedZone = zones.find((z) => z.id === zoneId);

      if (selectedType.id === "missing_person") {
        await publicApi.createMissingReport({
          affectedZoneId: zoneId,
          fullName: form.fullName,
          age: form.age ? Number(form.age) : undefined,
          sex: form.sex || undefined,
          description: form.description || undefined,
          clothing: form.clothing || undefined,
          lastSeenPlace: form.publicLocation || undefined,
          isMinor: form.isMinor || false,
          consentPublic: true,
        });
      } else if (selectedType.id === "safe_person") {
        await publicApi.createSafeReport({
          affectedZoneId: zoneId,
          fullName: form.fullName,
          currentPlace: form.publicLocation,
          message: form.description || undefined,
        });
      } else if (selectedType.id === "hospitalized_person") {
        await publicApi.createHospitalizedReport({
          affectedZoneId: zoneId,
          fullName: form.fullName,
          approximateAge: form.approximateAge || undefined,
          sex: form.sex || undefined,
          hospitalName: form.hospitalName || undefined,
          publicLocation: form.publicLocation,
        });
      } else if (selectedType.id === "rescued_person") {
        await publicApi.createRescuedReport({
          name: form.fullName,
          approximateAge: form.approximateAge || undefined,
          sex: form.sex || undefined,
          publicLocation: form.publicLocation,
          state: selectedZone?.state || undefined,
          municipality: selectedZone?.municipality || undefined,
          conditionSummary: form.description || undefined,
        });
      } else if (selectedType.id === "deceased_person") {
        await publicApi.createDeceasedReport({
          affectedZoneId: zoneId,
          fullName: form.fullName,
          approximateAge: form.approximateAge || undefined,
          sex: form.sex || undefined,
          publicLocation: form.publicLocation,
          sourceReference: form.sourceReference || undefined,
        });
      } else if (selectedType.group === "center") {
        await publicApi.createHelpCenter({
          recordType: selectedType.id,
          name: form.centerName || `${selectedType.label} reportado`,
          publicLocation: form.publicLocation,
          state: form.state || undefined,
          municipality: form.municipality || undefined,
          operatingHours: form.operatingHours || undefined,
          observations: form.description || undefined,
          operationalStatus: "PENDIENTE_VERIFICACION",
        });
      } else {
        await publicApi.createEmergency({
          affectedZoneId: zoneId,
          type: selectedType.label,
          description: form.description || selectedType.label,
          peopleAffected: Number(form.peopleAffected) || 0,
          publicLocation: form.publicLocation,
        });
      }

      setStatus("success");
      setMessage("Reporte recibido. Nuestro equipo lo revisará y lo publicará de forma segura.");
      setForm({ affectedZoneId: zoneId });
    } catch (error) {
      setStatus("error");
      setMessage(friendlyApiError(error));
    }
  }

  const isPerson = selectedType?.group === "person";
  const isEmergency = selectedType?.group === "emergency";
  const isCenter = selectedType?.group === "center";
  const isMissing = selectedType?.id === "missing_person";
  const isHospitalized = selectedType?.id === "hospitalized_person";
  const isDeceased = selectedType?.id === "deceased_person";
  const isRescuedOrHospitalizedOrDeceased = ["hospitalized_person", "rescued_person", "deceased_person"].includes(selectedType?.id);
  const needsZones = isPerson || isEmergency;

  const zoneSelect = (
    <select className="input" name="affectedZoneId" value={form.affectedZoneId || ""} onChange={update} required>
      <option value="">Seleccionar zona afectada</option>
      {zones.map((z) => <option key={z.id} value={z.id}>{zoneLabel(z)}</option>)}
    </select>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionTitle title="Reportar" subtitle="Selecciona el tipo de reporte para ver el formulario correspondiente." />
      <PublicAccessNotice />

      <div className="card p-6">
        <h2 className="font-black text-lg mb-4">¿Qué deseas reportar?</h2>
        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {TYPES.map((type) => {
            const Icon = type.icon;
            const active = selectedType?.id === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => selectType(type)}
                className={`p-4 rounded-2xl border text-center transition-colors ${
                  active ? "border-red-500 bg-red-50" : "border-slate-200 hover:border-red-300 hover:bg-red-50"
                }`}
              >
                <Icon className={`mx-auto mb-2 ${active ? "text-red-600" : "text-slate-400"}`} size={22} />
                <span className={`text-sm font-bold ${active ? "text-red-700" : "text-slate-700"}`}>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!selectedType && (
        <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          Selecciona el tipo de reporte para continuar.
        </div>
      )}

      {selectedType && (
        <form ref={formRef} onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h2 className="font-black text-lg">{selectedType.label}</h2>

          {isDeceased && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 font-semibold">
              Este reporte requiere verificación oficial antes de ser publicado. No será visible públicamente de forma automática.
            </div>
          )}

          {isPerson && (
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                className="input sm:col-span-2"
                name="fullName"
                value={form.fullName || ""}
                onChange={update}
                placeholder={
                  isMissing ? "Nombre completo de la persona desaparecida" :
                  selectedType.id === "rescued_person" ? "Nombre o descripción de la persona rescatada" :
                  "Nombre completo"
                }
                required
              />

              {isMissing && (
                <>
                  <input
                    className="input"
                    name="age"
                    type="number"
                    min="0"
                    max="130"
                    value={form.age || ""}
                    onChange={update}
                    placeholder="Edad (opcional)"
                  />
                  <select className="input" name="sex" value={form.sex || ""} onChange={update}>
                    <option value="">Sexo (opcional)</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </>
              )}

              {isRescuedOrHospitalizedOrDeceased && (
                <>
                  <input
                    className="input"
                    name="approximateAge"
                    value={form.approximateAge || ""}
                    onChange={update}
                    placeholder="Edad aproximada (opcional)"
                  />
                  <select className="input" name="sex" value={form.sex || ""} onChange={update}>
                    <option value="">Sexo (opcional)</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </>
              )}

              {zoneSelect}

              <input
                className="input"
                name="publicLocation"
                value={form.publicLocation || ""}
                onChange={update}
                placeholder={
                  isMissing ? "Última zona donde fue vista" :
                  selectedType.id === "safe_person" ? "Lugar donde se encuentra actualmente" :
                  isHospitalized ? "Zona general (ej: Caracas, Miranda)" :
                  "Zona o referencia general"
                }
                required
              />

              {isMissing && (
                <>
                  <textarea
                    className="input sm:col-span-2 min-h-24"
                    name="description"
                    value={form.description || ""}
                    onChange={update}
                    placeholder="Descripción física: ropa, rasgos distintivos, señas particulares..."
                  />
                  <input
                    className="input"
                    name="clothing"
                    value={form.clothing || ""}
                    onChange={update}
                    placeholder="Ropa que vestía al momento de desaparecer (opcional)"
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input type="checkbox" name="isMinor" checked={form.isMinor || false} onChange={update} />
                    Es menor de edad
                  </label>
                </>
              )}

              {selectedType.id === "safe_person" && (
                <textarea
                  className="input sm:col-span-2 min-h-24"
                  name="description"
                  value={form.description || ""}
                  onChange={update}
                  placeholder="Mensaje adicional para la familia (opcional)"
                />
              )}

              {isHospitalized && (
                <input
                  className="input sm:col-span-2"
                  name="hospitalName"
                  value={form.hospitalName || ""}
                  onChange={update}
                  placeholder="Nombre del hospital o centro médico (si lo sabe)"
                />
              )}

              {selectedType.id === "rescued_person" && (
                <textarea
                  className="input sm:col-span-2 min-h-24"
                  name="description"
                  value={form.description || ""}
                  onChange={update}
                  placeholder="Estado general de la persona (sin datos médicos privados)"
                />
              )}

              {isDeceased && (
                <input
                  className="input sm:col-span-2"
                  name="sourceReference"
                  value={form.sourceReference || ""}
                  onChange={update}
                  placeholder="Fuente del reporte (ej: Cruz Roja, Bomberos, familiar directo)"
                />
              )}
            </div>
          )}

          {isEmergency && (
            <div className="grid sm:grid-cols-2 gap-4">
              {zoneSelect}
              <input
                className="input"
                name="publicLocation"
                value={form.publicLocation || ""}
                onChange={update}
                placeholder="Zona o referencia general"
                required
              />
              <input
                className="input"
                name="peopleAffected"
                type="number"
                min="0"
                value={form.peopleAffected || ""}
                onChange={update}
                placeholder="Número de personas afectadas"
              />
              <textarea
                className="input sm:col-span-2 min-h-28"
                name="description"
                value={form.description || ""}
                onChange={update}
                placeholder="Descripción de la situación"
                required
              />
            </div>
          )}

          {isCenter && (
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                className="input sm:col-span-2"
                name="centerName"
                value={form.centerName || ""}
                onChange={update}
                placeholder={selectedType.id === "shelter" ? "Nombre del refugio" : "Nombre del centro de acopio"}
                required
              />
              <input
                className="input sm:col-span-2"
                name="publicLocation"
                value={form.publicLocation || ""}
                onChange={update}
                placeholder="Ubicación o referencia (sin dirección exacta)"
                required
              />
              <input
                className="input"
                name="state"
                value={form.state || ""}
                onChange={update}
                placeholder="Estado"
              />
              <input
                className="input"
                name="municipality"
                value={form.municipality || ""}
                onChange={update}
                placeholder="Municipio"
              />
              <input
                className="input sm:col-span-2"
                name="operatingHours"
                value={form.operatingHours || ""}
                onChange={update}
                placeholder="Horario de atención (opcional)"
              />
              <textarea
                className="input sm:col-span-2 min-h-24"
                name="description"
                value={form.description || ""}
                onChange={update}
                placeholder="Descripción o notas adicionales"
              />
            </div>
          )}

          {zonesStatus === "loading" && needsZones && (
            <div className="rounded-2xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">Cargando zonas oficiales...</div>
          )}
          {zonesStatus === "error" && needsZones && (
            <div className="rounded-2xl bg-yellow-50 p-3 text-sm font-semibold text-yellow-800">
              No se pudieron cargar zonas oficiales. El envio queda pausado.
            </div>
          )}

          {message && (
            <div className={`rounded-2xl p-4 text-sm font-semibold ${
              status === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading" || (needsZones && !zonesReady)}
            className="btn bg-rescueRed text-white w-full disabled:opacity-60"
          >
            {status === "loading" ? "Enviando..." : "Enviar reporte"}
          </button>
        </form>
      )}
    </div>
  );
}
