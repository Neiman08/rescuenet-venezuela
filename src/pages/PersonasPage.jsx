import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Camera, Search, UserPlus } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

const WA_NUMBER = import.meta.env.VITE_PUBLIC_WHATSAPP_NUMBER || "12245914415";
const WA_MSG = encodeURIComponent("Hola RescateVZLA, quiero enviar información sobre una persona afectada.");

const TYPE_CONFIG = {
  missing_person:      { label: "Desaparecida",  badge: "bg-red-100 text-red-700"      },
  hospitalized_person: { label: "Hospitalizada", badge: "bg-blue-100 text-blue-700"    },
  rescued_person:      { label: "Rescatada",     badge: "bg-green-100 text-green-700"  },
  safe_person:         { label: "A salvo",        badge: "bg-green-100 text-green-700" },
  trapped_person:      { label: "Atrapado/a",    badge: "bg-orange-100 text-orange-700"},
  deceased_person:     { label: "Fallecida",     badge: "bg-slate-200 text-slate-700"  },
};

const TABS = [
  { key: "all",                 label: "Todos"          },
  { key: "missing_person",      label: "Desaparecidos"  },
  { key: "hospitalized_person", label: "Hospitalizados" },
  { key: "rescued_person",      label: "Rescatados"     },
  { key: "safe_person",         label: "A salvo"        },
];

const VERIFICATION_LABEL = {
  self_reported:    "Reportado",
  verified:         "Verificado",
  APROBADO:         "Aprobado",
  pending_review:   "Pendiente",
  rejected:         "Rechazado",
};

function buildApiParams(input) {
  const trimmed = input.trim();
  if (!trimmed) return {};
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 6) return { cedula: trimmed };
  return { q: trimmed };
}

function PersonCard({ person }) {
  const cfg = TYPE_CONFIG[person.type] || { label: person.type || "Persona", badge: "bg-slate-100 text-slate-700" };
  const verif = VERIFICATION_LABEL[person.verificationStatus] || person.verificationStatus;
  const date = person.updatedAt
    ? new Date(person.updatedAt).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <div className="card p-4 space-y-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="font-black text-slate-800 leading-snug">{person.name}</p>
        <span className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg whitespace-nowrap ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {(person.age || person.sex) && (
        <p className="text-xs text-slate-500">
          {[person.age && `Edad: ${person.age}`, person.sex && `Sexo: ${person.sex}`].filter(Boolean).join(" · ")}
        </p>
      )}

      {person.hospital && person.hospital !== "No indicado" && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Hospital:</span> {person.hospital}
        </p>
      )}

      {person.publicLocation && person.publicLocation !== "Zona no indicada" && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Zona:</span> {person.publicLocation}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
        {person.source && <span>{person.source}</span>}
        {verif && <span>· {verif}</span>}
        {date && <span>· {date}</span>}
      </div>
    </div>
  );
}

export default function PersonasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState(searchParams.get("q") || "");
  const [rows, setRows] = useState([]);
  const [fetchStatus, setFetchStatus] = useState("loading");
  const [activeTab, setActiveTab] = useState("all");

  function fetchResults(q) {
    setFetchStatus("loading");
    publicApi.searchFamily(buildApiParams(q))
      .then((payload) => {
        const next = payload.data || [];
        setRows(next);
        setFetchStatus(next.length ? "success" : "empty");
      })
      .catch(() => { setRows([]); setFetchStatus("error"); });
  }

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setInputValue(q);
    fetchResults(q);
    setActiveTab("all");
  }, [searchParams.toString()]);

  function handleSubmit(e) {
    e.preventDefault();
    const value = inputValue.trim();
    if (value) setSearchParams({ q: value });
    else setSearchParams({});
  }

  function handleClear() {
    setInputValue("");
    setSearchParams({});
  }

  const currentQuery = searchParams.get("q") || "";
  const tabCount = (key) => key === "all" ? rows.length : rows.filter((r) => r.type === key).length;
  const tabRows = activeTab === "all" ? rows : rows.filter((r) => r.type === activeTab);
  const visibleTabs = TABS.filter((t) => t.key === "all" || tabCount(t.key) > 0);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Personas"
        subtitle="Consulta el estado de una persona. Datos sensibles siempre protegidos."
        action={
          <Link className="btn bg-rescueBlue text-white flex items-center gap-2" to="/publicar-busqueda">
            <UserPlus size={18} /> Publicar búsqueda
          </Link>
        }
      />

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Busca a una persona por nombre, apellido, cédula o pasaporte"
            autoComplete="off"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-700 text-xl leading-none px-1"
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>
        <button type="submit" className="btn bg-navy text-white flex items-center justify-center gap-2">
          <Search size={16} /> Buscar persona
        </button>
      </form>

      {/* Photo search placeholder */}
      <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 px-4 py-3">
        <Camera size={16} className="text-slate-400 shrink-0" />
        <p className="text-xs text-slate-400">Búsqueda por foto — próximamente. No disponible en esta etapa.</p>
      </div>

      {/* Loading */}
      {fetchStatus === "loading" && (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Buscando...</div>
      )}

      {/* Error */}
      {fetchStatus === "error" && (
        <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>
      )}

      {/* Empty state — with query */}
      {fetchStatus === "empty" && currentQuery && (
        <div className="card p-6 space-y-4">
          <p className="font-semibold text-slate-700">
            No encontramos registros públicos con esa información.
          </p>
          <p className="text-sm text-slate-500">
            Es posible que aún no haya sido registrada, o que el término de búsqueda necesite ajustarse.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/publicar-busqueda"
              className="btn bg-navy text-white flex items-center justify-center gap-2"
            >
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

      {/* Empty state — no query */}
      {fetchStatus === "empty" && !currentQuery && (
        <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">
          {noApprovedDataMessage}
        </div>
      )}

      {/* Results */}
      {fetchStatus === "success" && (
        <>
          {/* Status tabs */}
          {visibleTabs.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {visibleTabs.map((tab) => {
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
                    {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Cards grid */}
          {tabRows.length > 0 ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tabRows.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              No hay personas en esta categoría.
            </div>
          )}
        </>
      )}
    </div>
  );
}
