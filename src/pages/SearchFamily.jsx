import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import DataTable from "../components/DataTable";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

function labelForPersonType(type) {
  const labels = {
    missing_person: "Desaparecido",
    hospitalized_person: "Hospitalizado",
    rescued_person: "Rescatado",
    safe_person: "Localizado",
    trapped_person: "Atrapado",
  };
  return labels[type] || type || "Persona";
}

export default function SearchFamily() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");

  function loadResults(params = {}) {
    setStatus("loading");
    publicApi.searchFamily(params)
      .then((payload) => {
        const nextRows = (payload.data || []).map((item) => ({
          id: item.id,
          name: item.name,
          age: item.age,
          sex: item.sex,
          publicLocation: item.publicLocation,
          type: labelForPersonType(item.type),
          hospital: item.hospital || "No indicado",
          source: item.source || "RescueNet",
        }));
        if (nextRows.length) {
          setRows(nextRows);
          setStatus("success");
        } else {
          setRows([]);
          setStatus("empty");
        }
      })
      .catch(() => {
        setRows([]);
        setStatus("error");
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
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, cedula, hospital, zona o edificio" />
        <button type="submit" className="btn bg-navy text-white flex items-center justify-center gap-2"><Search size={18} /> Buscar</button>
      </form>
      <Link to="/coincidencias" className="btn bg-white border border-slate-200 text-navy inline-flex items-center justify-center gap-2"><Search size={18} /> Ver coincidencias</Link>
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {status === "empty" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>}
      <DataTable
        columns={[
          { key: "name", label: "Persona", align: "left", wrap: true },
          { key: "type", label: "Tipo" },
          { key: "age", label: "Edad", hideOnMobile: true },
          { key: "sex", label: "Sexo", hideOnMobile: true },
          { key: "publicLocation", label: "Zona publica", wrap: true },
          { key: "source", label: "Fuente", hideOnMobile: true },
        ]}
        rows={filteredRows}
      />
    </div>
  );
}
