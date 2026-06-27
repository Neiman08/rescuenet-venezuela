import { useCallback, useEffect, useState } from "react";
import { CheckCircle, CopyCheck, FileUp, Play, ShieldAlert, XCircle } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import StatusBadge from "../components/StatusBadge";
import { friendlyApiError, institutionalApi } from "../lib/api";

const recordTypes = ["", "missing_person", "hospitalized_person", "trapped_person", "safe_person", "rescued_person", "hospital", "shelter", "help_center"];
const statuses = ["", "NO_VERIFICADO", "APROBADO", "RECHAZADO", "DUPLICADO"];

export default function InstitutionalIngestionReview() {
  const [filters, setFilters] = useState({ recordType: "", verificationStatus: "", possibleDuplicate: "" });
  const [records, setRecords] = useState([]);
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [manualJson, setManualJson] = useState("[\n  {\n    \"nombre\": \"\",\n    \"edad\": \"\",\n    \"estado\": \"desaparecida\",\n    \"zona\": \"\",\n    \"descripcion\": \"\"\n  }\n]");
  const [manualReport, setManualReport] = useState(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const [recordsPayload, runsPayload] = await Promise.all([
        institutionalApi.getIngestionRecords(filters),
        institutionalApi.getIngestionRuns(),
      ]);
      setRecords(recordsPayload?.data || []);
      setRuns(runsPayload?.data || []);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setMessage(friendlyApiError(error));
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function act(action, id) {
    setMessage("");
    try {
      await action(id);
      await load();
    } catch (error) {
      setMessage(friendlyApiError(error));
    }
  }

  async function manualUpload(dryRun = true) {
    setMessage("");
    try {
      const records = JSON.parse(manualJson);
      const payload = await institutionalApi.manualUpload({
        sourceName: "Carga institucional manual",
        dryRun,
        records,
      });
      setManualReport(payload.data);
      if (!dryRun) await load();
    } catch (error) {
      setMessage(error instanceof SyntaxError ? "El JSON no es valido. Revisa comas, llaves y comillas." : friendlyApiError(error));
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Ingesta institucional" subtitle="Revision protegida de registros humanitarios importados desde fuentes publicas." />

      <div className="rounded-2xl bg-yellow-50 p-4 text-sm font-semibold text-yellow-900 flex gap-3">
        <ShieldAlert className="shrink-0" />
        <span>Los registros importados permanecen NO VERIFICADOS hasta aprobacion institucional. Raw payload y datos sensibles no deben publicarse.</span>
      </div>

      <div className="card p-5 grid lg:grid-cols-[1fr_180px_180px_180px] gap-3">
        <select className="input" name="recordType" value={filters.recordType} onChange={updateFilter}>
          {recordTypes.map((type) => <option key={type} value={type}>{type || "Todos los tipos"}</option>)}
        </select>
        <select className="input" name="verificationStatus" value={filters.verificationStatus} onChange={updateFilter}>
          {statuses.map((item) => <option key={item} value={item}>{item || "Todos los estados"}</option>)}
        </select>
        <select className="input" name="possibleDuplicate" value={filters.possibleDuplicate} onChange={updateFilter}>
          <option value="">Duplicados: todos</option>
          <option value="true">Solo posibles duplicados</option>
          <option value="false">Sin duplicado marcado</option>
        </select>
        <button className="btn bg-navy text-white flex items-center justify-center gap-2" onClick={() => act(() => institutionalApi.runIngestion(), "run")}>
          <Play size={18} /> Ejecutar
        </button>
      </div>

      <section className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-lg">Cargar datos reales</h2>
            <p className="text-sm text-slate-600">Solo datos verificados o recopilados por instituciones. El preview no guarda en base de datos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn bg-slate-800 text-white flex items-center gap-2" onClick={() => manualUpload(true)}><FileUp size={17} /> Preview</button>
            <button className="btn bg-rescueGreen text-white flex items-center gap-2" onClick={() => manualUpload(false)}><CheckCircle size={17} /> Importar NO VERIFICADO</button>
          </div>
        </div>
        <textarea className="input min-h-48 font-mono text-xs" value={manualJson} onChange={(event) => setManualJson(event.target.value)} />
        {manualReport && (
          <div className="grid sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3"><strong>{manualReport.recordsExtracted}</strong><br />extraidos</div>
            <div className="rounded-xl bg-slate-50 p-3"><strong>{manualReport.recordsNormalized}</strong><br />normalizados</div>
            <div className="rounded-xl bg-slate-50 p-3"><strong>{manualReport.recordsImported}</strong><br />importados</div>
            <div className="rounded-xl bg-slate-50 p-3"><strong>{manualReport.possibleDuplicates}</strong><br />duplicados</div>
          </div>
        )}
      </section>

      {message && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-800">{message}</div>}
      {status === "loading" && <div className="card p-5 text-sm font-semibold text-slate-600">Cargando registros institucionales...</div>}

      <div className="grid xl:grid-cols-[1fr_320px] gap-6">
        <section className="space-y-3">
          {records.map((record) => (
            <article key={record.id} className="card p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">{record.sourceName} - {record.recordType}</p>
                  <h2 className="font-black text-lg">{record.publicSafe?.fullName || record.fullName || "Registro sin nombre publico"}</h2>
                  <p className="text-sm text-slate-600">{record.publicSafe?.zone || record.publicSafe?.state || "Zona no indicada"}</p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={record.verificationStatus} />
                  {record.confidenceLevel && <span className="badge bg-blue-100 text-blue-700">Confianza {record.confidenceLevel} {record.confidenceScore}</span>}
                  {record.possibleDuplicate && <span className="badge bg-orange-100 text-orange-700">Duplicado {record.duplicateScore}</span>}
                </div>
              </div>
              <p className="text-sm text-slate-700">{record.publicSafe?.description || record.status || "Sin descripcion publica."}</p>
              <details className="rounded-xl bg-slate-50 p-3 text-xs">
                <summary className="cursor-pointer font-bold">Raw payload autorizado</summary>
                <pre className="mt-3 overflow-auto whitespace-pre-wrap">{JSON.stringify(record.rawPayload, null, 2)}</pre>
              </details>
              <div className="flex flex-wrap gap-2">
                <button className="btn bg-rescueGreen text-white flex items-center gap-2" onClick={() => act(institutionalApi.approveIngestionRecord, record.id)}><CheckCircle size={17} /> Aprobar</button>
                <button className="btn bg-red-600 text-white flex items-center gap-2" onClick={() => act(institutionalApi.rejectIngestionRecord, record.id)}><XCircle size={17} /> Rechazar</button>
                <button className="btn bg-slate-800 text-white flex items-center gap-2" onClick={() => act(institutionalApi.markDuplicate, record.id)}><CopyCheck size={17} /> Marcar duplicado</button>
              </div>
            </article>
          ))}
          {status === "success" && !records.length && <div className="card p-5 text-sm font-semibold text-slate-600">No hay registros con estos filtros.</div>}
        </section>
        <aside className="card p-5 h-fit space-y-3">
          <h2 className="font-black">Corridas recientes</h2>
          {runs.slice(0, 8).map((run) => (
            <div key={run.id} className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex justify-between gap-2">
                <strong>{run.source?.name || "Fuente multiple"}</strong>
                <StatusBadge status={run.status} />
              </div>
              <p className="text-xs text-slate-500">{new Date(run.startedAt).toLocaleString()}</p>
              <p className="text-xs text-slate-600">{run.recordsImported} importados / {run.duplicatesFound} duplicados</p>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
