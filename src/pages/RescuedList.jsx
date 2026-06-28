import { Link } from "react-router-dom";
import { ShieldPlus } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import { noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

function normalizeRescued(item) {
  return {
    id: item.id,
    name: item.name || item.fullName || "Informacion protegida",
    age: item.age || item.approximateAge || "No indicada",
    sex: item.sex || item.gender || "No indicado",
    status: item.status || item.verificationStatus || "Rescatado",
    publicLocation: item.publicLocation || item.currentPlace || item.lastSeenPlace || item.zone || "Zona no indicada",
    source: item.source || item.sourceName || "RescueNet",
  };
}

export default function RescuedList() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    publicApi.getRescued()
      .then((payload) => {
        const nextRows = (payload.data || []).map(normalizeRescued);
        setRows(nextRows);
        setStatus(nextRows.length ? "success" : "empty");
      })
      .catch(() => {
        setRows([]);
        setStatus("error");
      });
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Personas rescatadas"
        subtitle="Registros verificados de personas rescatadas con datos sensibles protegidos."
        action={<Link to="/registrar-rescatado" className="btn bg-rescueGreen text-white flex items-center gap-2"><ShieldPlus size={18} /> Registrar rescatado</Link>}
      />
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {status === "empty" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">No hay personas rescatadas verificadas todavía.</div>}
      {rows.length > 0 && (
        <DataTable
          columns={[
            { key: "name", label: "Nombre", align: "left", wrap: true },
            { key: "age", label: "Edad", hideOnMobile: true },
            { key: "sex", label: "Sexo", hideOnMobile: true },
            { key: "status", label: "Estado", badge: true },
            { key: "publicLocation", label: "Zona publica", wrap: true },
            { key: "source", label: "Fuente", wrap: true, hideOnMobile: true },
          ]}
          rows={rows}
        />
      )}
    </div>
  );
}
