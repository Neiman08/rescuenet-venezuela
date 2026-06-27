import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import DataTable from "../components/DataTable";
import { demoDataEnabled, noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { rescuedPeople } from "../data/mockData";
import { publicApi } from "../lib/api";

export default function SearchFamily() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(demoDataEnabled ? rescuedPeople : []);
  const [status, setStatus] = useState("loading");

  function loadResults(params = {}) {
    setStatus("loading");
    publicApi.searchFamily(params)
      .then((payload) => {
        const nextRows = (payload.data || []).map((item) => ({
          id: item.code || item.id,
          name: item.name,
          age: item.age,
          rescuedAt: item.publicLocation,
          status: item.status,
          privacy: item.privacyLevel === "restricted" ? "Informacion protegida" : "Resumen publico",
          type: item.type,
          hospital: item.hospital || "No indicado",
        }));
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
  }

  useEffect(() => {
    loadResults();
  }, []);

  function submitSearch(event) {
    event.preventDefault();
    const value = query.trim();
    const digits = value.replace(/\D/g, "");
    loadResults(digits.length >= 6 ? { cedula: value } : { q: value });
  }

  const filteredRows = rows;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Buscar familiar"
        subtitle="Busqueda publica con proteccion de datos sensibles para menores y ubicaciones exactas."
        action={<Link className="btn bg-rescueBlue text-white flex items-center gap-2" to="/publicar-busqueda"><UserPlus size={18} /> Publicar busqueda</Link>}
      />
      <PublicAccessNotice />
      <form className="card p-5 grid md:grid-cols-[1fr_auto] gap-4" onSubmit={submitSearch}>
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, senas particulares, zona o codigo RV" />
        <button type="submit" className="btn bg-navy text-white flex items-center justify-center gap-2"><Search size={18} /> Buscar</button>
      </form>
      <Link to="/coincidencias" className="btn bg-white border border-slate-200 text-navy inline-flex items-center justify-center gap-2"><Search size={18} /> Ver coincidencias</Link>
      {status === "fallback" && <div className="rounded-2xl bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">No pudimos conectar con el backend. Mostrando datos simulados locales.</div>}
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {status === "empty" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>}
      <DataTable
        columns={[
          { key: "id", label: "Codigo" },
          { key: "name", label: "Persona" },
          { key: "age", label: "Edad" },
          { key: "rescuedAt", label: "Zona publica" },
          { key: "status", label: "Estado", badge: true },
          { key: "type", label: "Tipo" },
          { key: "privacy", label: "Privacidad", render: (row) => (row.isMinor ? "Informacion protegida" : "Resumen publico") },
        ]}
        rows={filteredRows}
      />
    </div>
  );
}
