import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import DataTable from "../components/DataTable";
import { demoDataEnabled, noRealDataMessage } from "../config/demoData";
import { rescuedPeople } from "../data/mockData";
import { publicApi } from "../lib/api";

export default function SearchFamily() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(demoDataEnabled ? rescuedPeople : []);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.allSettled([publicApi.getRescued(), publicApi.getMissingReports(), publicApi.getSafeReports()])
      .then(([rescued, missing, safe]) => {
        const nextRows = [];
        if (rescued.status === "fulfilled") {
          nextRows.push(...(rescued.value.data || []).map((item) => ({
            id: item.code || item.id,
            name: item.name || "Informacion protegida",
            age: item.approximateAge || "No indicada",
            rescuedAt: item.affectedZone ? `${item.affectedZone.sector}, ${item.affectedZone.state}` : "Zona no indicada",
            status: item.status,
            privacy: item.privacyLevel === "restricted" ? "Informacion protegida" : "Resumen publico",
          })));
        }
        if (missing.status === "fulfilled") {
          nextRows.push(...(missing.value.data || []).map((item) => ({
            id: item.id,
            name: item.fullName,
            age: item.age || "No indicada",
            rescuedAt: item.affectedZone ? `${item.affectedZone.sector}, ${item.affectedZone.state}` : item.lastSeenPlace,
            status: item.verificationStatus,
            privacy: item.privacyLevel === "restricted" ? "Informacion protegida" : "Busqueda publica",
          })));
        }
        if (safe.status === "fulfilled") {
          nextRows.push(...(safe.value.data || []).map((item) => ({
            id: item.id,
            name: item.fullName,
            age: "Reportado a salvo",
            rescuedAt: item.affectedZone ? `${item.affectedZone.sector}, ${item.affectedZone.state}` : item.currentPlace,
            status: item.verificationStatus,
            privacy: "Contacto protegido",
          })));
        }
        if (nextRows.length) {
          setRows(nextRows);
          setStatus("success");
        } else {
          setRows(demoDataEnabled ? rescuedPeople : []);
          setStatus(demoDataEnabled ? "fallback" : "empty");
        }
      })
      .catch(() => {
        setRows(demoDataEnabled ? rescuedPeople : []);
        setStatus(demoDataEnabled ? "fallback" : "error");
      });
  }, []);

  const filteredRows = rows.filter((row) => {
    const text = `${row.id} ${row.name} ${row.rescuedAt} ${row.status}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Buscar familiar"
        subtitle="Busqueda publica con proteccion de datos sensibles para menores y ubicaciones exactas."
        action={<Link className="btn bg-rescueBlue text-white flex items-center gap-2" to="/publicar-busqueda"><UserPlus size={18} /> Publicar busqueda</Link>}
      />
      <PublicAccessNotice />
      <div className="card p-5 grid md:grid-cols-[1fr_auto] gap-4">
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, senas particulares, zona o codigo RV" />
        <Link to="/coincidencias" className="btn bg-navy text-white flex items-center justify-center gap-2"><Search size={18} /> Ver coincidencias</Link>
      </div>
      {status === "fallback" && <div className="rounded-2xl bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">No pudimos conectar con el backend. Mostrando datos simulados locales.</div>}
      {(status === "error" || status === "empty") && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      <DataTable
        columns={[
          { key: "id", label: "Codigo" },
          { key: "name", label: "Persona" },
          { key: "age", label: "Edad" },
          { key: "rescuedAt", label: "Zona publica" },
          { key: "status", label: "Estado", badge: true },
          { key: "privacy", label: "Privacidad", render: (row) => (row.isMinor ? "Informacion protegida" : "Resumen publico") },
        ]}
        rows={filteredRows}
      />
    </div>
  );
}
