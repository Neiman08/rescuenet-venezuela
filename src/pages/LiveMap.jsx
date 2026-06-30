import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2, ChevronDown, Globe, Home, LogIn, MapPin,
  Package, Search, X,
} from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import MapPreview from "../components/MapPreview";
import { publicApi } from "../lib/api";

const VZ_STATES = [
  "Amazonas","Anzoátegui","Apure","Aragua","Barinas","Bolívar",
  "Carabobo","Cojedes","Delta Amacuro","Distrito Capital","Falcón",
  "Guárico","La Guaira","Lara","Mérida","Miranda","Monagas",
  "Nueva Esparta","Portuguesa","Sucre","Táchira","Trujillo","Yaracuy","Zulia",
];

const PRIORITY_CFG = {
  CRITICA: { label: "Crítica",  badge: "bg-red-100 text-red-700 border border-red-200",         dot: "bg-red-500"    },
  ALTA:    { label: "Alta",     badge: "bg-orange-100 text-orange-700 border border-orange-200", dot: "bg-orange-500" },
  MEDIA:   { label: "Media",    badge: "bg-yellow-100 text-yellow-700 border border-yellow-200", dot: "bg-yellow-500" },
  BAJA:    { label: "Baja",     badge: "bg-green-100 text-green-700 border border-green-200",    dot: "bg-green-500"  },
};

const STATUS_CFG = {
  OPERATIVO: "bg-emerald-50 text-emerald-700",
  ACTIVO:    "bg-emerald-50 text-emerald-700",
  CERRADO:   "bg-red-50 text-red-700",
  LIMITADO:  "bg-yellow-50 text-yellow-700",
};

const CENTER_TYPES = [
  { key: "",          label: "Todos los tipos"       },
  { key: "ayuda",     label: "Centro de ayuda"       },
  { key: "acopio",    label: "Centro de acopio"      },
  { key: "farmacia",  label: "Farmacia"              },
  { key: "ong",       label: "ONG / Fundación"       },
  { key: "iglesia",   label: "Iglesia"               },
  { key: "cruz_roja", label: "Cruz Roja"             },
  { key: "gobierno",  label: "Defensa / Protección civil" },
];

function detectCategory(c) {
  const name = (c.name || "").toLowerCase();
  const tags = (c.tags || []).join(" ").toLowerCase();
  if (/farmacia|farmatodo|locatel|farmahorro|drogueria/.test(name)) return "farmacia";
  if (/cruz roja/.test(name) || /cruz_roja/.test(tags)) return "cruz_roja";
  if (/defensa civil|proteccion civil|bombero|protección civil/.test(name)) return "gobierno";
  if (/iglesia|parroquia|jesucristo|adventista|evangelica|evangelis|catedral|capilla/.test(name)) return "iglesia";
  if (/\bong\b|fundacion|fundación|asociacion|asociación/.test(name)) return "ong";
  if (c.recordType === "collection_center") return "acopio";
  return "ayuda";
}

const CATEGORY_LABELS = {
  ayuda:     "Centro de ayuda",
  acopio:    "Centro de acopio",
  farmacia:  "Farmacia",
  iglesia:   "Iglesia",
  cruz_roja: "Cruz Roja",
  gobierno:  "Entidad gubernamental",
  ong:       "ONG / Fundación",
};

function toReport(item, prefix, color) {
  const zone = item.affectedOperationalZone || item.affectedZone || {};
  return {
    id: `${prefix}-${item.id}`,
    type: prefix === "hosp" ? "Hospital" : prefix === "shel" ? "Refugio" : "Centro",
    status: item.status || item.operationalStatus || "Operativo",
    zone: item.publicLocation || item.zone || zone.sector,
    affectedZone: zone,
    color,
    isInternational: item.isInternational,
  };
}

// ── Shared UI atoms ──────────────────────────────────────────────────────────

function PriorityBadge({ level }) {
  const cfg = PRIORITY_CFG[(level || "").toUpperCase()] || {
    label: level || "—",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatusChip({ status }) {
  const key = (status || "").toUpperCase();
  const cls = STATUS_CFG[key] || "bg-slate-100 text-slate-600";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{status || "—"}</span>;
}

function FilterSelect({ value, onChange, options, label }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:border-navy"
        >
          {options.map((o) => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function SectionDivider({ icon: Icon, color, emoji, title, count }) {
  return (
    <div className={`flex items-center gap-3 pb-5 border-b-2 ${color}`}>
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm text-xl">
        {emoji}
      </div>
      <div className="flex-1">
        <h2 className="font-black text-xl text-slate-800">{title}</h2>
        {count != null && (
          <p className="text-sm text-slate-500">
            {count.toLocaleString("es-VE")} {count === 1 ? "registro" : "registros"}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptySection({ msg }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 px-6 py-10 text-center">
      <p className="text-slate-400 text-sm">{msg}</p>
    </div>
  );
}

// ── Cards ────────────────────────────────────────────────────────────────────

function ZoneCard({ zone }) {
  const level = (zone.level || zone.priority || "").toUpperCase();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">📍 Zona afectada</span>
        <PriorityBadge level={level} />
      </div>
      <p className="font-black text-slate-800 text-base leading-snug">{zone.sector}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Estado</p>
          <p className="text-sm text-slate-700">{zone.state || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Municipio</p>
          <p className="text-sm text-slate-700">{zone.municipality || "—"}</p>
        </div>
      </div>
    </div>
  );
}

function HospitalCard({ h }) {
  const az = h.affectedZone || h.affectedOperationalZone || {};
  return (
    <div className="bg-white rounded-2xl border border-blue-100 p-5 space-y-3 hover:shadow-md transition-all">
      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">🏥 Hospital</span>
      <p className="font-black text-slate-800 text-base leading-snug">{h.name}</p>
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400 font-semibold text-xs">Estado</span>
          <span className="text-slate-700">{az.state || "—"}</span>
        </div>
        {az.municipality && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-semibold text-xs">Municipio</span>
            <span className="text-slate-700">{az.municipality}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-slate-400 font-semibold text-xs">Estado operativo</span>
          <StatusChip status={h.status || h.operationalStatus} />
        </div>
        {h.capacity > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-semibold text-xs">Capacidad</span>
            <span className="text-slate-700">{h.capacity} camas</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
        <span className="text-[10px] text-slate-400">Fuente: Sistema RescateVZLA</span>
        {h.operationalPriority && <PriorityBadge level={h.operationalPriority} />}
      </div>
    </div>
  );
}

function ShelterCard({ s }) {
  const az = s.affectedZone || s.affectedOperationalZone || {};
  return (
    <div className="bg-white rounded-2xl border border-green-100 p-5 space-y-3 hover:shadow-md transition-all">
      <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">🏠 Refugio</span>
      <p className="font-black text-slate-800 text-base leading-snug">{s.name}</p>
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400 font-semibold text-xs">Estado</span>
          <span className="text-slate-700">{az.state || "—"}</span>
        </div>
        {az.municipality && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-semibold text-xs">Municipio</span>
            <span className="text-slate-700">{az.municipality}</span>
          </div>
        )}
        {s.capacity > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-semibold text-xs">Capacidad</span>
            <span className="text-slate-700 font-semibold">{s.capacity.toLocaleString("es-VE")} personas</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-slate-400 font-semibold text-xs">Disponibilidad</span>
          <StatusChip status={s.status || s.operationalStatus} />
        </div>
      </div>
      <div className="pt-2 border-t border-slate-50 text-[10px] text-slate-400">
        Fuente: Sistema RescateVZLA
      </div>
    </div>
  );
}

function CenterCard({ c }) {
  const cat = detectCategory(c);
  const catLabel = CATEGORY_LABELS[cat] || "Centro";
  const location = c.publicLocation || c.zone || c.municipality;
  const typeLabel = c.recordType === "collection_center" ? "Centro de acopio" : "Centro de ayuda";
  return (
    <div className="bg-white rounded-2xl border border-purple-100 p-5 space-y-3 hover:shadow-md transition-all">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">📦 {typeLabel}</span>
        {c.isInternational && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <Globe size={9} /> Diáspora
          </span>
        )}
      </div>
      <p className="font-black text-slate-800 text-sm leading-snug">{c.name || "Sin nombre"}</p>
      <div className="space-y-2">
        {c.state && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-semibold text-xs">Estado</span>
            <span className="text-slate-700">{c.state}</span>
          </div>
        )}
        {location && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Ubicación</p>
            <p className="text-xs text-slate-600 line-clamp-2">{location}</p>
          </div>
        )}
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400 font-semibold text-xs">Categoría</span>
          <span className="text-purple-700 font-semibold text-xs">{catLabel}</span>
        </div>
      </div>
      {c.description && (
        <p className="text-[11px] text-slate-400 line-clamp-2 border-t border-slate-50 pt-2">{c.description}</p>
      )}
      <div className="pt-1 text-[10px] text-slate-400">
        Fuente: {c.sourceName ? c.sourceName.replace(" (Red Humanitaria Federada)", "") : "RescateVZLA"}
      </div>
    </div>
  );
}

// ── Grid wrapper ─────────────────────────────────────────────────────────────

function CardGrid({ children }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {children}
    </div>
  );
}

// ── Nav tab counts label ──────────────────────────────────────────────────────

function TabCount({ n }) {
  if (n == null) return null;
  return (
    <span className="ml-1.5 font-normal opacity-70 text-xs">
      ({n >= 1000 ? `${Math.floor(n / 1000)}k+` : n})
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function LiveMap() {
  const [raw, setRaw] = useState({
    zones: [], hospitals: [], shelters: [], helpCenters: [], reports: [], internationalCentersCount: 0,
  });
  const [loadStatus, setLoadStatus] = useState("loading");
  const [activeSection, setActiveSection] = useState("all");
  const [search, setSearch]               = useState("");

  // Section filters
  const [zonePriority, setZonePriority]   = useState("");
  const [hospState, setHospState]         = useState("");
  const [shelState, setShelState]         = useState("");
  const [ctrState, setCtrState]           = useState("");
  const [ctrType, setCtrType]             = useState("");
  const [intl, setIntl]                   = useState(false);

  // Section scroll refs
  const zonesRef    = useRef(null);
  const hospRef     = useRef(null);
  const shelRef     = useRef(null);
  const ctrRef      = useRef(null);

  // Load map data
  useEffect(() => {
    setLoadStatus("loading");
    publicApi.getMap({ includeInternational: intl })
      .then((d) => {
        setRaw({
          zones:                   d.zones || [],
          hospitals:               d.hospitals || [],
          shelters:                d.shelters || [],
          helpCenters:             d.helpCenters || [],
          reports:                 d.reports || [],
          internationalCentersCount: d.internationalCentersCount || 0,
        });
        setLoadStatus("success");
      })
      .catch(() => setLoadStatus("error"));
  }, [intl]);

  const sq = search.trim().toLowerCase();

  // Per-section filtered data
  const fZones = useMemo(() => {
    let z = raw.zones;
    if (zonePriority) z = z.filter(z => (z.level || z.priority || "").toUpperCase() === zonePriority);
    if (sq) z = z.filter(z => [z.sector, z.state, z.municipality].filter(Boolean).join(" ").toLowerCase().includes(sq));
    return z;
  }, [raw.zones, zonePriority, sq]);

  const fHosp = useMemo(() => {
    let h = raw.hospitals;
    if (hospState) h = h.filter(h => (h.affectedZone?.state || h.affectedOperationalZone?.state || "") === hospState);
    if (sq) h = h.filter(h => [h.name, h.affectedZone?.state, h.affectedZone?.municipality].filter(Boolean).join(" ").toLowerCase().includes(sq));
    return h;
  }, [raw.hospitals, hospState, sq]);

  const fShel = useMemo(() => {
    let s = raw.shelters;
    if (shelState) s = s.filter(s => (s.affectedZone?.state || s.affectedOperationalZone?.state || "") === shelState);
    if (sq) s = s.filter(s => [s.name, s.affectedZone?.state, s.affectedZone?.municipality].filter(Boolean).join(" ").toLowerCase().includes(sq));
    return s;
  }, [raw.shelters, shelState, sq]);

  const fCtr = useMemo(() => {
    let c = raw.helpCenters;
    if (ctrState) c = c.filter(c => (c.state || c.affectedOperationalZone?.state || "") === ctrState);
    if (ctrType) c = c.filter(c => detectCategory(c) === ctrType);
    if (sq) c = c.filter(c => [c.name, c.state, c.publicLocation, c.zone, c.municipality, c.description].filter(Boolean).join(" ").toLowerCase().includes(sq));
    return c;
  }, [raw.helpCenters, ctrState, ctrType, sq]);

  // Map data: filtered by active section
  const mapData = useMemo(() => {
    if (activeSection === "zones")     return { zones: fZones, reports: [] };
    if (activeSection === "hospitals") return { zones: [], reports: fHosp.map(h => toReport(h, "hosp", "blue")) };
    if (activeSection === "shelters")  return { zones: [], reports: fShel.map(s => toReport(s, "shel", "green")) };
    if (activeSection === "centers")   return { zones: [], reports: fCtr.map(c => toReport(c, "ctr", "purple")) };
    return {
      zones: raw.zones,
      reports: [
        ...raw.hospitals.map(h => toReport(h, "hosp", "blue")),
        ...raw.shelters.map(s => toReport(s, "shel", "green")),
        ...raw.helpCenters.slice(0, 300).map(c => toReport(c, "ctr", "purple")),
        ...raw.reports,
      ],
    };
  }, [activeSection, fZones, fHosp, fShel, fCtr, raw]);

  function goToSection(key) {
    setActiveSection(key);
    const ref = { zones: zonesRef, hospitals: hospRef, shelters: shelRef, centers: ctrRef }[key];
    if (ref?.current) {
      setTimeout(() => ref.current.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  const TABS = [
    { key: "all",       label: "Todas las capas", count: null },
    { key: "zones",     label: "📍 Zonas",         count: raw.zones.length },
    { key: "hospitals", label: "🏥 Hospitales",    count: raw.hospitals.length },
    { key: "shelters",  label: "🏠 Refugios",      count: raw.shelters.length },
    { key: "centers",   label: "📦 Centros",       count: raw.helpCenters.length },
  ];

  const stateOptions = [{ value: "", label: "Todos los estados" }, ...VZ_STATES.map(s => ({ value: s, label: s }))];

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <SectionTitle
        title="Mapa de emergencia"
        subtitle={
          loadStatus === "success"
            ? `${raw.zones.length} zonas · ${raw.hospitals.length} hospitales · ${raw.shelters.length} refugios · ${raw.helpCenters.length.toLocaleString("es-VE")} centros de ayuda`
            : "Cargando datos en tiempo real…"
        }
      />

      {/* ── Search + ONG button ─────────────────────────────────────────── */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="flex-1 flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
          <Search size={17} className="text-slate-400 shrink-0" />
          <input
            className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar zona, hospital, refugio, centro de ayuda…"
            autoComplete="off"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-700">
              <X size={15} />
            </button>
          )}
        </div>
        <Link
          to="/login"
          className="btn bg-navy text-white flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <LogIn size={16} /> Acceso ONG / Instituciones
        </Link>
      </div>

      {/* ── Section nav tabs ────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => tab.key === "all" ? setActiveSection("all") : goToSection(tab.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              activeSection === tab.key
                ? "bg-navy text-white shadow"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
            <TabCount n={tab.count} />
          </button>
        ))}
      </div>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      {loadStatus === "error" ? (
        <div className="rounded-2xl bg-red-50 border border-red-100 px-5 py-4 text-sm font-semibold text-red-700">
          No se pudo cargar el mapa. Verifica tu conexión e intenta de nuevo.
        </div>
      ) : (
        <section className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-[500px]">
          <MapPreview zonesData={mapData.zones} reports={mapData.reports} />
        </section>
      )}

      {/* ── Section 1 · Zonas afectadas ─────────────────────────────────── */}
      <section ref={zonesRef} className="space-y-5 pt-2">
        <SectionDivider
          emoji="📍"
          color="border-red-400"
          title="Zonas afectadas"
          count={fZones.length}
        />

        {/* Priority filter chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "",        label: "Todas" },
            { key: "CRITICA", label: "Crítica"  },
            { key: "ALTA",    label: "Alta"     },
            { key: "MEDIA",   label: "Media"    },
            { key: "BAJA",    label: "Baja"     },
          ].map(({ key, label }) => {
            const cfg = PRIORITY_CFG[key] || {};
            const active = zonePriority === key;
            return (
              <button
                key={key}
                onClick={() => { setZonePriority(key); setActiveSection("zones"); }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? (cfg.badge || "bg-navy text-white border-navy")
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {key && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot || "bg-slate-400"}`} />}
                {label}
              </button>
            );
          })}
        </div>

        {loadStatus === "loading" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 animate-pulse">
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-5 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : fZones.length === 0 ? (
          <EmptySection msg="No hay zonas que coincidan con los filtros seleccionados." />
        ) : (
          <CardGrid>
            {fZones.map((z) => <ZoneCard key={z.id} zone={z} />)}
          </CardGrid>
        )}
      </section>

      {/* ── Section 2 · Hospitales ──────────────────────────────────────── */}
      <section ref={hospRef} className="space-y-5 pt-4">
        <SectionDivider
          emoji="🏥"
          color="border-blue-400"
          title="Hospitales"
          count={fHosp.length}
        />

        <div className="flex flex-wrap gap-3">
          <FilterSelect
            value={hospState}
            onChange={(v) => { setHospState(v); setActiveSection("hospitals"); }}
            options={stateOptions}
            label="Estado"
          />
        </div>

        {loadStatus === "loading" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-blue-100 p-5 space-y-3 animate-pulse">
                <div className="h-3 bg-blue-50 rounded w-1/3" />
                <div className="h-5 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : fHosp.length === 0 ? (
          <EmptySection msg="No hay hospitales que coincidan con el filtro de estado." />
        ) : (
          <CardGrid>
            {fHosp.map((h) => <HospitalCard key={h.id} h={h} />)}
          </CardGrid>
        )}
      </section>

      {/* ── Section 3 · Refugios ────────────────────────────────────────── */}
      <section ref={shelRef} className="space-y-5 pt-4">
        <SectionDivider
          emoji="🏠"
          color="border-green-400"
          title="Refugios"
          count={fShel.length}
        />

        <div className="flex flex-wrap gap-3">
          <FilterSelect
            value={shelState}
            onChange={(v) => { setShelState(v); setActiveSection("shelters"); }}
            options={stateOptions}
            label="Estado"
          />
        </div>

        {loadStatus === "loading" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-green-100 p-5 space-y-3 animate-pulse">
                <div className="h-3 bg-green-50 rounded w-1/3" />
                <div className="h-5 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : fShel.length === 0 ? (
          <EmptySection msg="No hay refugios que coincidan con el filtro de estado." />
        ) : (
          <CardGrid>
            {fShel.map((s) => <ShelterCard key={s.id} s={s} />)}
          </CardGrid>
        )}
      </section>

      {/* ── Section 4 · Centros de ayuda y acopio ───────────────────────── */}
      <section ref={ctrRef} className="space-y-5 pt-4">
        <SectionDivider
          emoji="📦"
          color="border-purple-400"
          title="Centros de ayuda y acopio"
          count={fCtr.length}
        />

        <div className="flex flex-wrap gap-3 items-end">
          <FilterSelect
            value={ctrState}
            onChange={(v) => { setCtrState(v); setActiveSection("centers"); }}
            options={stateOptions}
            label="Estado"
          />
          <FilterSelect
            value={ctrType}
            onChange={(v) => { setCtrType(v); setActiveSection("centers"); }}
            options={CENTER_TYPES.map(t => ({ value: t.key, label: t.label }))}
            label="Tipo"
          />

          {/* Internacional toggle — inside this section per spec */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Diáspora</span>
            <label className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${
              intl
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
              <input
                type="checkbox"
                checked={intl}
                onChange={(e) => { setIntl(e.target.checked); setActiveSection("centers"); }}
                className="accent-amber-600"
              />
              <Globe size={14} />
              Centros internacionales
              {raw.internationalCentersCount > 0 && (
                <span className="text-xs font-normal text-amber-500">
                  {raw.internationalCentersCount} diáspora
                </span>
              )}
            </label>
          </div>
        </div>

        {loadStatus === "loading" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-purple-100 p-5 space-y-3 animate-pulse">
                <div className="h-3 bg-purple-50 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : fCtr.length === 0 ? (
          <EmptySection msg="No hay centros que coincidan con los filtros seleccionados." />
        ) : (
          <>
            <CardGrid>
              {fCtr.slice(0, 100).map((c) => <CenterCard key={c.id} c={c} />)}
            </CardGrid>
            {fCtr.length > 100 && (
              <p className="text-center text-xs text-slate-400 pt-2">
                Mostrando 100 de {fCtr.length.toLocaleString("es-VE")} centros. Usa los filtros para encontrar el más cercano.
              </p>
            )}
          </>
        )}
      </section>

    </div>
  );
}
