import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, Search, UserPlus, X } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { publicApi } from "../lib/api";

const WA_NUMBER = import.meta.env.VITE_PUBLIC_WHATSAPP_NUMBER || "12245914415";
const WA_MSG = encodeURIComponent("Hola RescateVZLA, quiero enviar información sobre una persona afectada.");

const TYPE_CONFIG = {
  missing_person:      { label: "Desaparecido/a",  badge: "bg-red-100 text-red-700"       },
  hospitalized_person: { label: "Hospitalizado/a", badge: "bg-blue-100 text-blue-700"     },
  rescued_person:      { label: "Rescatado/a",     badge: "bg-emerald-100 text-emerald-700" },
  safe_person:         { label: "A salvo",          badge: "bg-green-100 text-green-700"   },
  trapped_person:      { label: "Atrapado/a",      badge: "bg-orange-100 text-orange-700" },
  deceased_person:     { label: "Fallecido/a",     badge: "bg-slate-200 text-slate-600"   },
};

const TABS = [
  { key: "all",                 label: "Todos"              },
  { key: "missing_person",      label: "Desaparecidos"      },
  { key: "hospitalized_person", label: "Hospitalizados"     },
  { key: "safe_person",         label: "Localizados/A salvo"},
  { key: "deceased_person",     label: "Fallecidos"         },
];

const VENEZUELA_STATES = [
  "Amazonas","Anzoátegui","Apure","Aragua","Barinas","Bolívar","Carabobo",
  "Cojedes","Delta Amacuro","Distrito Capital","Falcón","Guárico",
  "La Guaira","Lara","Mérida","Miranda","Monagas","Nueva Esparta",
  "Portuguesa","Sucre","Táchira","Trujillo","Yaracuy","Zulia",
];

function fmt(val) {
  return val && val !== "No indicada" && val !== "Zona no indicada" ? val : null;
}

function PersonCard({ person }) {
  const cfg = TYPE_CONFIG[person.type || person.recordType] || { label: "Persona", badge: "bg-slate-100 text-slate-700" };
  const date = person.capturedAt || person.updatedAt
    ? new Date(person.capturedAt || person.updatedAt).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })
    : null;
  const name = person.fullName || person.name;
  const age = person.approximateAge || person.age;
  const gender = person.gender || person.sex;
  const location = fmt(person.publicLocation) || fmt(person.currentPlace) || fmt(person.lastSeenPlace) || fmt(person.zone);
  const state = fmt(person.state);
  const muni = fmt(person.municipality);
  const hospital = fmt(person.hospital) || fmt(person.hospitalName);
  const isRedayuda = person.isRedayuda || person.source === "Redayuda";

  return (
    <div className="card p-4 space-y-2 hover:shadow-md transition-shadow border border-slate-100">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-black text-slate-800 leading-snug text-sm">{name || "Nombre protegido"}</p>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* Age / Gender */}
      {(age || gender) && (
        <p className="text-xs text-slate-500">
          {[age && `Edad: ${age}`, gender && `Sexo: ${gender}`].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* Photo */}
      {person.photoUrl && (
        <img
          src={person.photoUrl}
          alt={name || "foto"}
          className="w-full max-h-40 object-cover rounded-lg"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}

      {/* Hospital */}
      {hospital && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Hospital:</span> {hospital}
        </p>
      )}

      {/* Location */}
      {(location || state || muni) && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Zona:</span>{" "}
          {[location, muni && muni !== location ? muni : null, state].filter(Boolean).join(", ")}
        </p>
      )}

      {/* Description */}
      {person.description && (
        <p className="text-xs text-slate-500 line-clamp-2">{person.description}</p>
      )}

      {/* Cedula + Phone (Redayuda standard records) */}
      {person.cedula && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Cédula:</span> {person.cedula}
        </p>
      )}
      {person.phone && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Contacto:</span> {person.phone}
        </p>
      )}

      {/* Status (description) */}
      {person.status && person.status !== "activo" && person.status !== "Sin información" && (
        <p className="text-xs text-slate-500">
          <span className="font-semibold">Estado:</span> {person.status}
        </p>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400 pt-1 border-t border-slate-50">
        {isRedayuda && (
          <span className="bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded text-[10px]">
            Fuente: RedAyuda
          </span>
        )}
        {person.verificationStatus === "NO_VERIFICADO" && (
          <span className="text-slate-400">Pendiente de verificación</span>
        )}
        {date && <span>· {date}</span>}
      </div>
    </div>
  );
}

export default function PersonasPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [inputValue, setInputValue]   = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab]     = useState(searchParams.get("type") || "all");
  const [stateFilter, setStateFilter] = useState(searchParams.get("state") || "");
  const [muniFilter, setMuniFilter]   = useState(searchParams.get("municipality") || "");

  const [rows, setRows]               = useState([]);
  const [meta, setMeta]               = useState({ total: 0, pages: 1, page: 1, byType: {} });
  const [fetchStatus, setFetchStatus] = useState("loading");
  const [loadingMore, setLoadingMore] = useState(false);

  const abortRef = useRef(null);

  const buildParams = useCallback((page = 1, append = false) => {
    const p = { page, limit: 50 };
    if (activeTab !== "all") p.type = activeTab;
    if (inputValue.trim()) p.q = inputValue.trim();
    if (stateFilter) p.state = stateFilter;
    if (muniFilter) p.municipality = muniFilter;
    return { p, append };
  }, [activeTab, inputValue, stateFilter, muniFilter]);

  const fetchPage = useCallback(async (page = 1, append = false) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (page === 1) setFetchStatus("loading");
    else setLoadingMore(true);

    try {
      const params = {};
      if (activeTab !== "all") params.type = activeTab;
      if (inputValue.trim()) params.q = inputValue.trim();
      if (stateFilter) params.state = stateFilter;
      if (muniFilter) params.municipality = muniFilter;
      params.page = page;
      params.limit = 50;

      const payload = await publicApi.listPersons(params);
      const next = payload.data || [];
      const nextMeta = payload.meta || { total: next.length, pages: 1, page: 1, byType: {} };

      setRows(prev => append ? [...prev, ...next] : next);
      setMeta(nextMeta);
      setFetchStatus(next.length || (append && rows.length) ? "success" : "empty");
    } catch (err) {
      if (err.name === "AbortError") return;
      setFetchStatus(append ? "success" : "error");
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, inputValue, stateFilter, muniFilter]);

  // Fetch on filter/tab change
  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  // Sync URL
  useEffect(() => {
    const p = {};
    if (inputValue.trim()) p.q = inputValue.trim();
    if (activeTab !== "all") p.type = activeTab;
    if (stateFilter) p.state = stateFilter;
    if (muniFilter) p.municipality = muniFilter;
    setSearchParams(p, { replace: true });
  }, [inputValue, activeTab, stateFilter, muniFilter]);

  function handleSearch(e) {
    e.preventDefault();
    fetchPage(1, false);
  }

  function handleLoadMore() {
    fetchPage(meta.page + 1, true);
  }

  const tabCount = (key) => {
    if (key === "all") return meta.total;
    return meta.byType?.[key] || 0;
  };

  const fmtTotal = (n) => n != null ? n.toLocaleString("es-VE") : "—";

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Personas"
        subtitle={`${fmtTotal(meta.total)} personas registradas · Datos de RedAyuda y reportes ciudadanos`}
        action={
          <Link className="btn bg-rescueBlue text-white flex items-center gap-2" to="/publicar-busqueda">
            <UserPlus size={18} /> Publicar búsqueda
          </Link>
        }
      />

      {/* Search bar */}
      <form onSubmit={handleSearch} className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Nombre, apellido, cédula, teléfono, hospital, zona…"
            autoComplete="off"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => setInputValue("")}
              className="text-slate-400 hover:text-slate-700 text-xl leading-none px-1"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button type="submit" className="btn bg-navy text-white flex items-center justify-center gap-2">
          <Search size={16} /> Buscar
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value); setMuniFilter(""); }}
            className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:border-navy"
          >
            <option value="">Todos los estados</option>
            {VENEZUELA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        {stateFilter && (
          <button
            onClick={() => { setStateFilter(""); setMuniFilter(""); }}
            className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50"
          >
            <X size={12} /> {stateFilter}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count = tabCount(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === tab.key ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 opacity-70 font-normal text-xs">
                  ({count >= 1000 ? `${Math.floor(count / 1000)}k+` : count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Source notice */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
        <div className="text-xs text-amber-800">
          <span className="font-bold">Datos RedAyuda:</span> Esta información proviene de la Red Humanitaria Federada Redayuda, utilizada con autorización para localización de personas durante la emergencia. Aparece marcada como{" "}
          <span className="font-semibold">Fuente: RedAyuda · Pendiente de verificación</span>.
        </div>
      </div>

      {/* Loading */}
      {fetchStatus === "loading" && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {fetchStatus === "error" && (
        <div className="card p-6 text-center space-y-3">
          <p className="font-semibold text-slate-700">No pudimos conectar con el servidor.</p>
          <button onClick={() => fetchPage(1)} className="btn bg-navy text-white text-sm">Reintentar</button>
        </div>
      )}

      {/* Empty */}
      {fetchStatus === "empty" && (
        <div className="card p-6 space-y-4">
          <p className="font-semibold text-slate-700">No encontramos registros con esos filtros.</p>
          <p className="text-sm text-slate-500">Prueba con otro nombre, cédula, hospital o zona.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/publicar-busqueda" className="btn bg-navy text-white flex items-center justify-center gap-2">
              <UserPlus size={16} /> Reportar persona desaparecida
            </Link>
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-[#25d366] text-white flex items-center justify-center gap-2"
            >
              Enviar información por WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Results */}
      {fetchStatus === "success" && rows.length > 0 && (
        <>
          <p className="text-xs text-slate-500">
            Mostrando {rows.length.toLocaleString("es-VE")} de {fmtTotal(meta.total)} registros
          </p>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>

          {/* Load more */}
          {meta.page < meta.pages && (
            <div className="text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn bg-white border border-slate-200 text-navy hover:bg-slate-50 flex items-center gap-2 mx-auto"
              >
                {loadingMore ? (
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-navy border-t-transparent rounded-full" />
                ) : (
                  <ChevronDown size={16} />
                )}
                {loadingMore ? "Cargando…" : `Ver más (${fmtTotal(meta.total - rows.length)} restantes)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
