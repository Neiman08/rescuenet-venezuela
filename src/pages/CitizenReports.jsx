import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, RefreshCw, XCircle } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { friendlyApiError, institutionalApi } from "../lib/api";

const TABS = [
  { key: "imported",    label: "Ciudadanos"    },
  { key: "missing",     label: "Desaparecidos" },
  { key: "emergencies", label: "Emergencias"   },
  { key: "safe",        label: "A salvo"       },
];

const STATUS_BADGE = {
  NO_VERIFICADO:  "bg-amber-100 text-amber-700",
  APROBADO:       "bg-green-100 text-green-700",
  RECHAZADO:      "bg-red-100 text-red-700",
  DUPLICADO:      "bg-slate-100 text-slate-600",
  pending_review: "bg-amber-100 text-amber-700",
  self_reported:  "bg-blue-100 text-blue-700",
  verified:       "bg-green-100 text-green-700",
  rejected:       "bg-red-100 text-red-700",
};

const STATUS_LABEL = {
  NO_VERIFICADO:  "Sin verificar",
  APROBADO:       "Aprobado",
  RECHAZADO:      "Rechazado",
  DUPLICADO:      "Duplicado",
  pending_review: "Pendiente",
  self_reported:  "Auto-reportado",
  verified:       "Verificado",
  rejected:       "Rechazado",
};

const TYPE_LABEL = {
  missing_person:      "Desaparecido/a",
  safe_person:         "A salvo",
  hospitalized_person: "Hospitalizado/a",
  rescued_person:      "Rescatado/a",
  deceased_person:     "Fallecido/a",
};

export default function CitizenReports() {
  const [activeTab, setActiveTab] = useState("imported");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});

  function load() {
    setLoading(true);
    setError(null);
    institutionalApi.getCitizenReports()
      .then((res) => { setData(res.data); setLoading(false); })
      .catch((err) => { setError(friendlyApiError(err)); setLoading(false); });
  }

  useEffect(load, []);

  async function review(type, id, payload) {
    setUpdating((cur) => ({ ...cur, [id]: true }));
    try {
      if (type === "imported") await institutionalApi.reviewImportedReport(id, payload);
      else if (type === "missing") await institutionalApi.reviewMissingReport(id, payload);
      else if (type === "emergency") await institutionalApi.reviewEmergencyReport(id, payload);
      load();
    } catch {
      load();
    } finally {
      setUpdating((cur) => { const n = { ...cur }; delete n[id]; return n; });
    }
  }

  const tabData = {
    imported:    data?.imported    || [],
    missing:     data?.missing     || [],
    emergencies: data?.emergencies || [],
    safe:        data?.safe        || [],
  };

  const records = tabData[activeTab] || [];
  const reviewType = activeTab === "emergencies" ? "emergency" : activeTab === "imported" ? "imported" : activeTab;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Reportes ciudadanos"
        subtitle="Revisa y verifica reportes enviados por el público antes de publicarlos."
        action={
          <button onClick={load} className="btn bg-navy text-white flex items-center gap-2">
            <RefreshCw size={16} /> Actualizar
          </button>
        }
      />

      {loading && <div className="card p-4 text-sm text-slate-500">Cargando reportes...</div>}
      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      {data && (
        <>
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const count = tabData[tab.key]?.length || 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    activeTab === tab.key ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {records.length === 0 && (
              <div className="card p-4 text-sm text-slate-500">No hay reportes pendientes en esta categoría.</div>
            )}
            {records.map((record) => (
              <ReportCard
                key={record.id}
                record={record}
                tab={activeTab}
                reviewType={reviewType}
                busy={!!updating[record.id]}
                onReview={(payload) => review(reviewType, record.id, payload)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReportCard({ record, tab, busy, onReview }) {
  const vs = record.verificationStatus;
  const date = record.createdAt
    ? new Date(record.createdAt).toLocaleDateString("es-VE", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;
  const displayName = record.fullName || record.publicSafe?.fullName || "Sin nombre";
  const typeLabel = TYPE_LABEL[record.recordType] || record.recordType || record.type || null;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="font-black text-slate-800 truncate">{displayName}</p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500">
            {typeLabel && <span className="font-semibold text-slate-600">{typeLabel}</span>}
            {record.affectedZone?.sector && <span>· {record.affectedZone.sector}</span>}
            {record.publicLocation && !record.affectedZone?.sector && <span>· {record.publicLocation}</span>}
            {record.code && <span className="font-mono">· {record.code}</span>}
            {date && <span>· {date}</span>}
          </div>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg ${STATUS_BADGE[vs] || "bg-slate-100 text-slate-600"}`}>
          {STATUS_LABEL[vs] || vs}
        </span>
      </div>

      {(record.description || record.message || record.publicSafe?.status) && (
        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 line-clamp-3">
          {record.description || record.message || record.publicSafe?.status}
        </p>
      )}

      {tab !== "safe" && (
        <div className="flex flex-wrap gap-2">
          {tab === "imported" && (
            <>
              <ActionBtn
                label="Aprobar"
                icon={<CheckCircle size={14} />}
                className="bg-green-100 text-green-700"
                disabled={busy || vs === "APROBADO"}
                onClick={() => onReview({ verificationStatus: "APROBADO" })}
              />
              <ActionBtn
                label="Rechazar"
                icon={<XCircle size={14} />}
                className="bg-red-100 text-red-700"
                disabled={busy || vs === "RECHAZADO"}
                onClick={() => onReview({ verificationStatus: "RECHAZADO" })}
              />
              <ActionBtn
                label="Duplicado"
                icon={<AlertTriangle size={14} />}
                className="bg-slate-100 text-slate-600"
                disabled={busy || vs === "DUPLICADO"}
                onClick={() => onReview({ verificationStatus: "DUPLICADO" })}
              />
            </>
          )}
          {tab === "missing" && (
            <>
              <ActionBtn
                label="Verificar"
                icon={<CheckCircle size={14} />}
                className="bg-green-100 text-green-700"
                disabled={busy || vs === "verified"}
                onClick={() => onReview({ verificationStatus: "verified" })}
              />
              <ActionBtn
                label="Rechazar"
                icon={<XCircle size={14} />}
                className="bg-red-100 text-red-700"
                disabled={busy || vs === "rejected"}
                onClick={() => onReview({ verificationStatus: "rejected" })}
              />
            </>
          )}
          {tab === "emergencies" && (
            <>
              <ActionBtn
                label="Verificar y activar"
                icon={<CheckCircle size={14} />}
                className="bg-green-100 text-green-700"
                disabled={busy || record.status === "IN_PROGRESS"}
                onClick={() => onReview({ verificationStatus: "verified", status: "IN_PROGRESS" })}
              />
              <ActionBtn
                label="Rechazar"
                icon={<XCircle size={14} />}
                className="bg-red-100 text-red-700"
                disabled={busy || record.status === "CLOSED"}
                onClick={() => onReview({ verificationStatus: "rejected", status: "CLOSED" })}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, icon, className, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40 ${className}`}
    >
      {icon} {label}
    </button>
  );
}
