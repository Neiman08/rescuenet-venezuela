import { useEffect, useState } from "react";
import { CheckCircle, ChevronDown, Eye, Search, XCircle } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { institutionalApi } from "../lib/api";

const TYPE_LABELS = {
  missing_person:      "Desaparecido/a",
  hospitalized_person: "Hospitalizado/a",
  safe_person:         "A salvo",
  rescued_person:      "Rescatado/a",
  deceased_person:     "Fallecido/a",
  help_center:         "Centro de ayuda",
  collection_center:   "Centro de acopio",
};

const STATUS_LABELS = {
  NO_VERIFICADO: { label: "Pendiente",  cls: "bg-yellow-100 text-yellow-700" },
  APROBADO:      { label: "Aprobado",   cls: "bg-green-100 text-green-700"   },
  RECHAZADO:     { label: "Rechazado",  cls: "bg-red-100 text-red-700"       },
};

const PRIVACY_LABELS = {
  standard:     "Estándar",
  restricted:   "Restringido",
  private_only: "Solo privado",
};

function Modal({ record, onClose, onUpdate }) {
  const [status, setStatus] = useState(record.verificationStatus);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await institutionalApi.updateRedayudaRecord(record.id, { verificationStatus: status });
      onUpdate(record.id, { verificationStatus: status });
      onClose();
    } catch {
      alert("Error al guardar cambios.");
    } finally {
      setSaving(false);
    }
  }

  const pub = record.publicSafe || {};
  const doc = record.documentPrivate || {};

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl mt-8 mb-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-black text-slate-800 text-lg">Registro Redayuda</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><XCircle size={22} /></button>
        </div>

        <div className="p-6 space-y-4 text-sm">
          {/* Type + Privacy */}
          <div className="flex gap-2 flex-wrap">
            <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-xs">
              {TYPE_LABELS[record.recordType] || record.recordType}
            </span>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
              {PRIVACY_LABELS[record.privacyLevel] || record.privacyLevel}
            </span>
          </div>

          {/* Person fields */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Nombre", record.fullName || pub.fullName],
              ["Edad", record.approximateAge || pub.approximateAge],
              ["Sexo", record.gender || pub.gender],
              ["Estado", record.state || pub.state],
              ["Municipio", record.municipality || pub.municipality],
              ["Zona", record.zone || pub.zone],
              ["Lugar actual", record.currentPlace || pub.currentPlace],
              ["Último lugar", record.lastSeenPlace || pub.lastSeenPlace],
              ["Hospital", record.hospitalName || pub.hospitalName],
              ["Cédula", doc.cedula],
              ["Teléfono", record.contactPrivate],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} className="space-y-0.5">
                <p className="text-xs text-slate-400 font-semibold">{label}</p>
                <p className="text-slate-700 break-words">{val}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {(record.description || pub.description) && (
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-1">Descripción</p>
              <p className="text-slate-700 whitespace-pre-wrap text-xs bg-slate-50 p-3 rounded-xl">
                {record.description || pub.description}
              </p>
            </div>
          )}

          {/* Photo */}
          {pub.photoUrl && (
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-1">Foto</p>
              <img src={pub.photoUrl} alt="foto" className="max-h-48 rounded-xl object-cover" />
            </div>
          )}

          {/* ID info */}
          <div className="text-xs text-slate-400 space-y-0.5 border-t border-slate-100 pt-3">
            <p>ID: {record.id}</p>
            <p>Fuente interna: {record.sourceRecordId}</p>
            <p>Importado: {record.capturedAt ? new Date(record.capturedAt).toLocaleString("es-VE") : "—"}</p>
          </div>

          {/* Status editor */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="font-semibold text-slate-700">Cambiar estado</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS_LABELS).map(([val, { label, cls }]) => (
                <button
                  key={val}
                  onClick={() => setStatus(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition ${
                    status === val ? "border-navy shadow-md " + cls : "border-transparent bg-slate-100 text-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={save}
              disabled={saving || status === record.verificationStatus}
              className="btn bg-navy text-white text-sm disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambio"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminRedayuda() {
  const [rows, setRows]           = useState([]);
  const [meta, setMeta]           = useState({ total: 0, pages: 1, page: 1, byType: {} });
  const [status, setStatus]       = useState("loading");
  const [q, setQ]                 = useState("");
  const [typeFilter, setType]     = useState("");
  const [statusFilter, setStatusF]= useState("");
  const [page, setPage]           = useState(1);
  const [selected, setSelected]   = useState(null);

  async function load(overridePage = page) {
    setStatus("loading");
    try {
      const params = { page: overridePage, limit: 50 };
      if (q.trim()) params.q = q.trim();
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const payload = await institutionalApi.listRedayudaRecords(params);
      setRows(payload.data || []);
      setMeta(payload.meta || { total: 0, pages: 1, page: 1, byType: {} });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => { load(1); setPage(1); }, [q, typeFilter, statusFilter]);
  useEffect(() => { load(page); }, [page]);

  function handleUpdate(id, changes) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
  }

  const fmtN = (n) => n?.toLocaleString("es-VE") ?? "—";

  return (
    <div className="space-y-6">
      {selected && (
        <Modal record={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />
      )}

      <SectionTitle
        title="Admin Redayuda"
        subtitle={`${fmtN(meta.total)} registros importados · Panel de revisión y aprobación`}
      />

      {/* Stats by type */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(meta.byType).map(([type, count]) => (
          <div key={type} className="card p-3 text-center">
            <p className="text-2xl font-black text-navy">{fmtN(count)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{TYPE_LABELS[type] || type}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5 min-w-48">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, cédula, zona…"
          />
        </div>

        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setType(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-sm"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusF(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="NO_VERIFICADO">Pendiente</option>
            <option value="APROBADO">Aprobado</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {status === "loading" && (
        <div className="card p-6 text-center text-sm text-slate-500">Cargando...</div>
      )}
      {status === "error" && (
        <div className="card p-6 text-center text-sm text-red-600">Error al cargar. <button onClick={() => load()} className="underline">Reintentar</button></div>
      )}
      {status === "success" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Tipo","Nombre","Estado","Municipio","Privacidad","Verificación","Acción"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(r => {
                  const statusCfg = STATUS_LABELS[r.verificationStatus] || { label: r.verificationStatus, cls: "bg-slate-100 text-slate-600" };
                  const pub = r.publicSafe || {};
                  const name = r.fullName || pub.fullName;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                          {TYPE_LABELS[r.recordType] || r.recordType}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate font-medium text-slate-800">
                        {name || <span className="text-slate-400 italic">Protegido</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {r.state || pub.state || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {r.municipality || pub.municipality || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {PRIVACY_LABELS[r.privacyLevel] || r.privacyLevel}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => setSelected(r)}
                          className="flex items-center gap-1 text-xs text-navy font-semibold hover:underline"
                        >
                          <Eye size={14} /> Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.pages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                Página {meta.page} de {meta.pages} · {fmtN(meta.total)} registros
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={meta.page <= 1}
                  className="btn bg-slate-100 text-slate-700 text-xs disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                  disabled={meta.page >= meta.pages}
                  className="btn bg-slate-100 text-slate-700 text-xs disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
