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

  useEffect(() => {
    publicApi.searchFamily()
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
