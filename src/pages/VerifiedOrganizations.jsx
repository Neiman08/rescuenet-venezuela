import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

export default function VerifiedOrganizations() {
  const [organizations, setOrganizations] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    publicApi.getOrganizations()
      .then((payload) => {
        const rows = payload?.data || [];
        setOrganizations(rows);
        setStatus(rows.length ? "success" : "empty");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle title="Organizaciones verificadas" subtitle="Registro de ONG con representante, categorias, zonas de trabajo y estado de verificacion." />
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {(status === "empty" || (status === "success" && !organizations.length)) && (
        <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>
      )}
      {organizations.length > 0 && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            {organizations.map((org) => (
              <div key={org.id} className="card p-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">{String(org.name || "?").slice(0, 2)}</div>
                <h2 className="font-black mt-4">{org.name}</h2>
                <p className="text-sm text-slate-500">{org.category}</p>
                <p className="text-xs text-slate-500 mt-2">{org.zones}</p>
              </div>
            ))}
          </div>
          <DataTable columns={[
            { key: "name", label: "Nombre" },
            { key: "country", label: "Pais" },
            { key: "location", label: "Estado/Ciudad" },
            { key: "representative", label: "Representante" },
            { key: "category", label: "Categorias" },
            { key: "status", label: "Estado", badge: true },
          ]} rows={organizations} />
        </>
      )}
    </div>
  );
}
