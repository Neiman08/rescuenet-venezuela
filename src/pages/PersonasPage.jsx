import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, Search, UserPlus, X } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { publicApi } from "../lib/api";

const WA_NUMBER = import.meta.env.VITE_PUBLIC_WHATSAPP_NUMBER || "12245914415";
const WA_MSG = encodeURIComponent("Hola RescateVZLA, quiero enviar información sobre una persona afectada.");

const TYPE_CONFIG = {
  missing_person:      { label: "Desaparecido/a",  badge: "bg-red-100 text-red-700"          },
  hospitalized_person: { label: "Hospitalizado/a", badge: "bg-blue-100 text-blue-700"        },
  rescued_person:      { label: "Rescatado/a",     badge: "bg-emerald-100 text-emerald-700"  },
  safe_person:         { label: "A salvo",          badge: "bg-green-100 text-green-700"      },
  trapped_person:      { label: "Atrapado/a",      badge: "bg-orange-100 text-orange-700"    },
  deceased_person:     { label: "Fallecido/a",     badge: "bg-slate-200 text-slate-600"      },
};

const TABS = [
  { key: "all",                 label: "Todos"               },
  { key: "missing_person",      label: "Desaparecidos"       },
  { key: "hospitalized_person", label: "Hospitalizados"      },
  { key: "safe_person",         label: "Localizados / A salvo" },
  { key: "deceased_person",     label: "Fallecidos"          },
];

const VENEZUELA_STATES = [
  "Amazonas","Anzoátegui","Apure","Aragua","Barinas","Bolívar","Carabobo",
  "Cojedes","Delta Amacuro","Distrito Capital","Falcón","Guárico",
  "La Guaira","Lara","Mérida","Miranda","Monagas","Nueva Esparta",
  "Portuguesa","Sucre","Táchira","Trujillo","Yaracuy","Zulia",
];

// ─── visual helpers ──────────────────────────────────────────────────────────
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isUrl(value) {
  try { const u = new URL(String(value || "").trim()); return u.protocol.startsWith("http"); }
  catch { return false; }
}

function isValidLocation(value) {
  if (!value) return false;
  const v = String(value).trim();
  if (!v || v === "No indicada" || v === "Zona no indicada") return false;
  return !isEmail(v) && !isUrl(v);
}

// Splits Redayuda's structured description into usable parts.
// Pattern: "Ultima vez visto: email · Ficha: url · Fuente: domain"
function parseDescription(raw) {
  if (!raw) return { clean: null, fichaUrl: null };
  let fichaUrl = null;
  const kept = [];
  for (const seg of raw.split(/\s*·\s*/)) {
    const s = seg.trim();
    if (!s) continue;
    const lv = s.match(/^[Úu]ltima?\s+vez\s+visto:\s*(.+)$/i);
    if (lv && isEmail(lv[1].trim())) continue;
    const fi = s.match(/^Ficha:\s*(\S+)$/i);
    if (fi && isUrl(fi[1])) { fichaUrl = fichaUrl || fi[1]; continue; }
    if (/^Fuente:/i.test(s)) continue;
    if (isUrl(s)) { fichaUrl = fichaUrl || s; continue; }
    if (isEmail(s)) continue;
    kept.push(s);
  }
  return { clean: kept.length ? kept.join(" · ") : null, fichaUrl };
}

// Normalize Venezuelan mobile to E.164 digits for wa.me links.
function toWaPhone(phone) {
  let p = String(phone || "").replace(/\D/g, "");
  if (p.startsWith("04") && p.length === 11) p = "58" + p.slice(1);
  else if (p.startsWith("4") && p.length === 10) p = "58" + p;
  return p;
}

const STATUS_DUPLICATES = new Set([
  "encontrado", "encontrada", "desaparecido", "desaparecida",
  "hospitalizado", "hospitalizada", "rescatado", "rescatada",
  "atrapado", "atrapada", "fallecido", "fallecida",
]);

function PersonCard({ person }) {
  const cfg = TYPE_CONFIG[person.type || person.recordType] || { label: "Persona", badge: "bg-slate-100 text-slate-700" };
  const date = person.capturedAt || person.updatedAt
    ? new Date(person.capturedAt || person.updatedAt).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  const name     = person.fullName || person.name;
  const age      = person.approximateAge || person.age;
  const gender   = person.gender || person.sex;
  const hospital = isValidLocation(person.hospital) ? person.hospital
                 : isValidLocation(person.hospitalName) ? person.hospitalName : null;

  const location = [person.publicLocation, person.currentPlace, person.lastSeenPlace, person.zone]
    .find(isValidLocation) || null;
  const muni     = isValidLocation(person.municipality) ? person.municipality : null;
  const state    = isValidLocation(person.state) ? person.state : null;

  const { clean: cleanDesc, fichaUrl } = parseDescription(person.description);
  const isRedayuda = person.isRedayuda || person.source === "Redayuda";
  const phone      = person.phone;
  const waPhone    = phone ? toWaPhone(phone) : null;
  const showStatus = person.status &&
    !STATUS_DUPLICATES.has(String(person.status).toLowerCase()) &&
    !["activo", "Sin información", "sin información"].includes(person.status);

  return (
    <div className="card p-4 space-y-2 hover:shadow-md transition-shadow border border-slate-100">
      {/* 1. Nombre + Badge */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-black text-slate-800 leading-snug text-sm">{name || "Nombre no disponible"}</p>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* 2. Foto — solo si es URL completa */}
      {isUrl(person.photoUrl) && (
        <img
          src={person.photoUrl}
          alt={name || "foto"}
          className="w-full max-h-40 object-cover rounded-lg"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}

      {/* 3. Edad / Sexo */}
      {(age || gender) && (
        <p className="text-xs text-slate-500">
          {[age && `Edad: ${age}`, gender && `Sexo: ${gender}`].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* 4. Cédula */}
      {person.cedula && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Cédula:</span> {person.cedula}
        </p>
      )}

      {/* 5. Teléfono + Llamar / WhatsApp */}
      {phone && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Contacto:</span> {phone}
          </p>
          <a
            href={`tel:${phone}`}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            Llamar
          </a>
          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 hover:bg-green-100"
          >
            WhatsApp
          </a>
        </div>
      )}

      {/* 6. Hospital */}
      {hospital && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Hospital:</span> {hospital}
        </p>
      )}

      {/* 7. Última ubicación conocida */}
      {location && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Última ubicación:</span> {location}
        </p>
      )}

      {/* 8. Zona / Municipio / Estado */}
      {(muni || state) && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Zona:</span>{" "}
          {[muni, state].filter(Boolean).join(", ")}
        </p>
      )}

      {/* 9. Observaciones */}
      {cleanDesc && (
        <p className="text-xs text-slate-500 line-clamp-3">{cleanDesc}</p>
      )}

      {/* 10. Ficha original */}
      {fichaUrl && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Ficha:</span>{" "}
          <a
            href={fichaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Ver ficha
          </a>
        </p>
      )}

      {/* 11. Estado (solo si no duplica el badge) */}
      {showStatus && (
        <p className="text-xs text-slate-500">
          <span className="font-semibold">Estado:</span> {person.status}
        </p>
      )}

      {/* Footer: fuente, verificación, fecha */}
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

  // Input state (delayed — only fires on submit or tab change)
  const [inputValue, setInputValue]   = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab]     = useState(searchParams.get("type") || "all");
  const [stateFilter, setStateFilter] = useState(searchParams.get("state") || "");

  // Data state
  const [rows, setRows]               = useState([]);
  const [meta, setMeta]               = useState({ total: null, pages: null, page: 1, byType: {} });
  const [fetchStatus, setFetchStatus] = useState("loading");
  const [loadingMore, setLoadingMore] = useState(false);

  const searchRef = useRef(null);
  const abortRef  = useRef(null);

  // Auto-focus search input when navigated here with ?q=
  useEffect(() => {
    if (searchParams.get("q") && searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  // Build API params. Pure-digit input (5–15 chars) is treated as a cédula/phone and
  // routed to ?cedula= so the backend uses the JSON-path index instead of a full ILIKE scan.
  const buildParams = useCallback((page, skipCounts) => {
    const p = { page, limit: 50 };
    if (skipCounts) p.counts = "false";
    if (activeTab !== "all") p.type = activeTab;
    const v = inputValue.trim();
    if (v) {
      if (/^\d{5,15}$/.test(v)) p.cedula = v;
      else p.q = v;
    }
    if (stateFilter) p.state = stateFilter;
    return p;
  }, [activeTab, inputValue, stateFilter]);

  const fetchPage = useCallback(async (page = 1, append = false) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (page === 1) setFetchStatus("loading");
    else setLoadingMore(true);

    try {
      // Skip expensive COUNT + GROUP BY on load-more requests (page > 1)
      const params = buildParams(page, page > 1);
      const payload = await publicApi.listPersons(params);
      const next     = payload.data || [];
      const nextMeta = payload.meta || {};

      setRows(prev => append ? [...prev, ...next] : next);

      if (page === 1) {
        // First page: store full meta (total, pages, byType)
        setMeta(nextMeta);
      } else {
        // Load-more: keep total/pages/byType from page 1, just update current page
        setMeta(prev => ({ ...prev, page: nextMeta.page ?? page }));
      }

      const hasResults = next.length > 0 || (append && rows.length > 0);
      setFetchStatus(hasResults ? "success" : "empty");
    } catch (err) {
      if (err.name === "AbortError") return;
      setFetchStatus(append ? "success" : "error");
    } finally {
      setLoadingMore(false);
    }
  }, [buildParams]);

  // Refetch from page 1 when filters/tab change
  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  // Sync URL params
  useEffect(() => {
    const p = {};
    if (inputValue.trim()) p.q = inputValue.trim();
    if (activeTab !== "all") p.type = activeTab;
    if (stateFilter) p.state = stateFilter;
    setSearchParams(p, { replace: true });
  }, [inputValue, activeTab, stateFilter]);

  function handleSearch(e) {
    e.preventDefault();
    fetchPage(1, false);
  }

  function handleTabChange(key) {
    setActiveTab(key);
  }

  function handleLoadMore() {
    fetchPage(meta.page + 1, true);
  }

  const fmtN = (n) => n != null ? n.toLocaleString("es-VE") : "—";

  // Show "Ver más" when we know there's more data
  const hasMore = meta.total != null
    ? rows.length < meta.total
    : meta.page < (meta.pages || 0);

  const tabCount = (key) => {
    if (key === "all") return meta.total;
    return meta.byType?.[key] ?? null;
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Personas"
        subtitle={
          meta.total != null
            ? `${fmtN(meta.total)} personas registradas · Datos de RedAyuda y reportes ciudadanos`
            : "Cargando registros…"
        }
      />

      {/* ── Search bar + Publicar búsqueda ─────────────────────────────── */}
      <div className="card p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              ref={searchRef}
              className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Nombre, apellido o cédula/teléfono…"
              autoComplete="off"
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => setInputValue("")}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Limpiar"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button type="submit" className="btn bg-navy text-white flex items-center justify-center gap-2">
            <Search size={16} /> Buscar
          </button>
          <Link
            to="/publicar-busqueda"
            className="btn bg-rescueBlue text-white flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <UserPlus size={16} /> Publicar búsqueda
          </Link>
        </form>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:border-navy"
          >
            <option value="">Todos los estados</option>
            {VENEZUELA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        {stateFilter && (
          <button
            onClick={() => setStateFilter("")}
            className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50"
          >
            <X size={12} /> {stateFilter}
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count = tabCount(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === tab.key
                  ? "bg-navy text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
              {count != null && count > 0 && (
                <span className="ml-1.5 opacity-70 font-normal text-xs">
                  ({count >= 1000 ? `${Math.floor(count / 1000)}k+` : count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── RedAyuda notice ────────────────────────────────────────────── */}
      <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
        <p className="text-xs text-amber-800">
          <span className="font-bold">Datos RedAyuda:</span> Información de la Red Humanitaria Federada, utilizada con autorización para la localización de personas durante la emergencia.
          Aparece marcada como <span className="font-semibold">Fuente: RedAyuda · Pendiente de verificación</span>.
        </p>
      </div>

      {/* ── Loading skeleton ───────────────────────────────────────────── */}
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

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {fetchStatus === "error" && (
        <div className="card p-6 text-center space-y-3">
          <p className="font-semibold text-slate-700">No pudimos conectar con el servidor.</p>
          <button onClick={() => fetchPage(1)} className="btn bg-navy text-white text-sm">Reintentar</button>
        </div>
      )}

      {/* ── Empty ──────────────────────────────────────────────────────── */}
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

      {/* ── Results ────────────────────────────────────────────────────── */}
      {fetchStatus === "success" && rows.length > 0 && (
        <>
          <p className="text-xs text-slate-500">
            Mostrando {rows.length.toLocaleString("es-VE")}
            {meta.total != null ? ` de ${fmtN(meta.total)} registros` : " registros"}
          </p>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>

          {/* Ver más */}
          {hasMore && (
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
                {loadingMore
                  ? "Cargando…"
                  : meta.total != null
                    ? `Ver más (${fmtN(meta.total - rows.length)} restantes)`
                    : "Ver más"
                }
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
