import { useEffect, useState } from "react";
import { Download, ExternalLink, Hospital, Info, Siren, Users } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import { noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";
import { usePublicAffectedZones } from "../hooks/usePublicAffectedZones";

const LEVEL_CONFIG = {
  CRITICA:  { label: "Critica",  bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-100 text-red-700"    },
  ALTA:     { label: "Alta",     bg: "bg-orange-50",  border: "border-orange-200", badge: "bg-orange-100 text-orange-700" },
  MEDIA:    { label: "Media",    bg: "bg-yellow-50",  border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700" },
  BAJA:     { label: "Baja",     bg: "bg-slate-50",   border: "border-slate-200",  badge: "bg-slate-100 text-slate-600"  },
};

const OPERATIONAL_STATUS_LABEL = {
  RESPUESTA_ACTIVA:       "Respuesta activa",
  EVALUACION_RAPIDA:      "Evaluacion rapida",
  MONITOREO_REFORZADO:    "Monitoreo reforzado",
  VIGILANCIA:             "Vigilancia",
  PENDIENTE_VERIFICACION: "Pendiente de verificacion",
};

const OFFICIAL_SOURCES = [
  { name: "Presidencia de la Republica Bolivariana de Venezuela", url: "https://www.presidencia.gob.ve", short: "presidencia.gob.ve" },
  { name: "Vicepresidencia Ejecutiva de Venezuela",               url: "https://www.vicepresidencia.gob.ve", short: "vicepresidencia.gob.ve" },
  { name: "Ministerio del Poder Popular para Relaciones Interiores, Justicia y Paz / Proteccion Civil", url: "https://www.mpprijp.gob.ve", short: "mpprijp.gob.ve" },
];

export default function GovernmentPanel() {
  const [stats, setStats] = useState({});
  const [dashStatus, setDashStatus] = useState("loading");
  const [zoneFilter, setZoneFilter] = useState("");

  const { zones, status: zonesStatus } = usePublicAffectedZones();

  useEffect(() => {
    publicApi.getDashboard()
      .then((payload) => {
        setStats(payload?.stats || {});
        setDashStatus("success");
      })
      .catch(() => setDashStatus("error"));
  }, []);

  const filteredZones = zoneFilter
    ? zones.filter((z) => z.id === zoneFilter)
    : zones;

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Panel gobierno"
        subtitle="Indicadores consolidados para coordinacion oficial y exportacion de reportes."
        action={
          <button className="btn bg-navy text-white flex gap-2 items-center">
            <Download size={18} /> Exportar reporte
          </button>
        }
      />

      {/* ── Datos internos RescueNet ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Datos internos RescueNet</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <p className="text-xs text-slate-500 flex gap-1 items-start">
          <Info size={13} className="mt-0.5 shrink-0" />
          Cifras derivadas de los registros cargados y verificados en la plataforma RescueNet Venezuela. No representan un balance oficial del Gobierno.
        </p>

        {dashStatus === "error" && (
          <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>
        )}

        <div className="grid md:grid-cols-4 gap-4">
          <StatCard title="Desaparecidos"       value={(stats.missingPeople    || 0).toLocaleString()} color="orange" icon={<Users />}    />
          <StatCard title="Emergencias activas" value={(stats.activeEmergencies || 0).toLocaleString()} color="red"    icon={<Siren />}    />
          <StatCard title="Hospitalizados"      value={(stats.hospitalizedPeople|| 0).toLocaleString()} color="blue"   icon={<Hospital />} />
          <StatCard title="Rescatados"          value={(stats.rescuedPeople    || 0).toLocaleString()} color="green"  icon={<Users />}    />
          <StatCard title="A salvo"             value={(stats.safePeople       || 0).toLocaleString()} color="blue"   icon={<Users />}    />
          <StatCard title="Centros activos"     value={(stats.activeCenters    || 0).toLocaleString()} color="purple" icon={<Hospital />} />
          <StatCard title="Reportes pendientes" value={(stats.pendingReports   || 0).toLocaleString()} color="orange" icon={<Siren />}    />
          <StatCard title="Incidentes criticos" value={(stats.criticalIncidents|| 0).toLocaleString()} color="red"    icon={<Siren />}    />
        </div>
      </section>

      {/* ── Zonas afectadas ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Zonas afectadas</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {zonesStatus !== "error" && zones.length > 0 && (
          <select
            className="input w-full md:w-72"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          >
            <option value="">Todas las zonas afectadas ({zones.length})</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.sector} — {z.state}
              </option>
            ))}
          </select>
        )}

        {zonesStatus === "loading" && (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Cargando zonas...</div>
        )}

        {zonesStatus === "error" && (
          <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>
        )}

        {(zonesStatus === "success" || zonesStatus === "empty") && filteredZones.length === 0 && (
          <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            No hay reporte oficial detallado de zonas afectadas disponible todavia.
          </div>
        )}

        {filteredZones.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredZones.map((zone) => {
              const config = LEVEL_CONFIG[zone.level] || LEVEL_CONFIG.MEDIA;
              const opLabel = OPERATIONAL_STATUS_LABEL[zone.operationalStatus] || zone.operationalStatus;
              return (
                <div key={zone.id} className={`card p-5 border ${config.border} ${config.bg} space-y-2`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-slate-800">{zone.sector}</p>
                      <p className="text-xs text-slate-500">{zone.municipality}{zone.parish ? ` · ${zone.parish}` : ""} · {zone.state}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-lg shrink-0 ${config.badge}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Estado operativo: <span className="font-semibold">{opLabel}</span>
                  </p>
                  <p className="text-xs text-slate-400">Verificacion: {zone.verification || "Pendiente"}</p>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-slate-400 flex gap-1 items-start">
          <Info size={12} className="mt-0.5 shrink-0" />
          Las zonas reflejan el catalogo operativo de RescueNet. No incluyen descripcion oficial de afectaciones; esa informacion proviene del balance oficial del Gobierno.
        </p>
      </section>

      {/* ── Balance oficial Gobierno ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Balance oficial Gobierno</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="card p-6 border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Balance oficial pendiente de carga por el equipo autorizado.</p>
          <p className="text-xs text-slate-500">
            Cuando el equipo administrativo cargue cifras del Gobierno Bolivariano, apareceran aqui con fuente, enlace y fecha/hora del reporte.
            Ninguna cifra oficial sera publicada sin referencia verificable.
          </p>
          <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-500">Campos requeridos por cifra oficial:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Fuente (nombre del organismo)</li>
              <li>Enlace a la fuente original</li>
              <li>Fecha y hora del reporte</li>
              <li>Nota: "Cifra oficial publicada por la fuente gubernamental correspondiente."</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Fuentes oficiales ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Fuentes oficiales</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <p className="text-xs text-slate-500">
          Organismos del Estado venezolano de referencia para informacion oficial sobre emergencias.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {OFFICIAL_SOURCES.map((src) => (
            <a
              key={src.url}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card p-5 flex flex-col gap-2 hover:shadow-md transition group"
            >
              <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 leading-snug">{src.name}</p>
              <p className="text-xs text-blue-500 flex items-center gap-1">
                <ExternalLink size={11} /> {src.short}
              </p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
