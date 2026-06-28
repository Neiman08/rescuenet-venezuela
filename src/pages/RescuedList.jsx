import { Link } from "react-router-dom";
import { ShieldPlus } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

const groups = [
  { key: "missing", title: "Desaparecidos", typeLabel: "Desaparecido", loader: publicApi.getMissingReports },
  { key: "hospitalized", title: "Hospitalizados", typeLabel: "Hospitalizado", loader: publicApi.getHospitalized },
  { key: "rescued", title: "Rescatados", typeLabel: "Rescatado", loader: publicApi.getRescued },
  { key: "safe", title: "Localizados / A salvo", typeLabel: "A salvo", loader: publicApi.getSafeReports },
];

function normalizePerson(item, fallbackType) {
  const group = groups.find((entry) => entry.key === fallbackType);
  return {
    id: item.id,
    name: item.name || item.fullName || "Informacion protegida",
    type: group?.typeLabel || item.type || item.recordType || fallbackType,
    age: item.age || item.approximateAge || "No indicada",
    sex: item.sex || item.gender || "No indicado",
    publicLocation: item.publicLocation || item.currentPlace || item.lastSeenPlace || item.zone || "Zona no indicada",
    hospital: item.hospital || item.hospitalName || "No indicado",
    status: item.status || item.verificationStatus || "Por verificar",
    source: item.source || item.sourceName || "RescueNet",
  };
}

export default function RescuedList() {
  const [data, setData] = useState(Object.fromEntries(groups.map((group) => [group.key, []])));
  const [status, setStatus] = useState("loading");
  const [activeTab, setActiveTab] = useState("hospitalized");

  useEffect(() => {
    Promise.allSettled(groups.map((group) => group.loader()))
      .then((results) => {
        const nextData = {};
        results.forEach((result, index) => {
          const group = groups[index];
          nextData[group.key] = result.status === "fulfilled"
            ? (result.value.data || []).map((item) => normalizePerson(item, group.key))
            : [];
        });
        setData(nextData);
        setStatus(results.some((result) => result.status === "fulfilled") ? "success" : "error");
      })
      .catch(() => setStatus("error"));
  }, []);

  const total = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
  const activeGroup = groups.find((group) => group.key === activeTab) || groups[0];
  const activeRows = data[activeGroup.key] || [];

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Personas"
        subtitle="Desaparecidos, hospitalizados, rescatados y personas a salvo con datos sensibles protegidos."
        action={<Link to="/registrar-rescatado" className="btn bg-rescueGreen text-white flex items-center gap-2"><ShieldPlus size={18} /> Registrar rescatado</Link>}
      />
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {status === "success" && total === 0 && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>}
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => setActiveTab(group.key)}
            className={`btn border ${activeTab === group.key ? "bg-navy text-white border-navy" : "bg-white text-navy border-slate-200"}`}
          >
            {group.title} <span className="ml-2 rounded-full bg-white/20 px-2">{data[group.key]?.length || 0}</span>
          </button>
        ))}
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-black text-lg">{activeGroup.title}</h2>
          <span className="badge bg-blue-100 text-blue-700">{activeRows.length}</span>
        </div>
        {activeRows.length ? (
          <DataTable
            columns={[
              { key: "name", label: "Nombre", align: "left", wrap: true },
              { key: "age", label: "Edad", hideOnMobile: true },
              { key: "sex", label: "Sexo", hideOnMobile: true },
              { key: "status", label: "Estado", badge: true, hideOnMobile: true },
              { key: "publicLocation", label: "Zona", wrap: true },
              { key: "source", label: "Fuente", wrap: true, hideOnMobile: true },
            ]}
            rows={activeRows}
          />
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">Sin datos reales registrados todavía.</div>
        )}
      </section>
    </div>
  );
}
