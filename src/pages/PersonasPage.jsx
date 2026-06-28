import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

const TABS = [
  { key: "missing_person", label: "Desaparecidos" },
  { key: "hospitalized_person", label: "Hospitalizados" },
  { key: "rescued_person", label: "Rescatados" },
  { key: "safe_person", label: "Localizados / A salvo" },
];

const COLUMNS_BY_TAB = {
  missing_person: [
    { key: "name", label: "Persona", align: "left", wrap: true },
    { key: "age", label: "Edad", hideOnMobile: true },
    { key: "sex", label: "Sexo", hideOnMobile: true },
    { key: "publicLocation", label: "Ultima zona vista", wrap: true },
    { key: "source", label: "Fuente", hideOnMobile: true },
  ],
  hospitalized_person: [
    { key: "name", label: "Persona", align: "left", wrap: true },
    { key: "age", label: "Edad", hideOnMobile: true },
    { key: "sex", label: "Sexo", hideOnMobile: true },
    { key: "hospital", label: "Hospital", wrap: true, hideOnMobile: true },
    { key: "publicLocation", label: "Zona publica", wrap: true },
  ],
  rescued_person: [
    { key: "name", label: "Persona", align: "left", wrap: true },
    { key: "age", label: "Edad", hideOnMobile: true },
    { key: "sex", label: "Sexo", hideOnMobile: true },
    { key: "publicLocation", label: "Zona publica", wrap: true },
    { key: "source", label: "Fuente", hideOnMobile: true },
  ],
  safe_person: [
    { key: "name", label: "Persona", align: "left", wrap: true },
    { key: "publicLocation", label: "Zona actual", wrap: true },
    { key: "source", label: "Fuente", hideOnMobile: true },
  ],
};

export default function PersonasPage() {
  const [allRows, setAllRows] = useState([]);
  const [status, setStatus] = useState("loading");
  const [activeTab, setActiveTab] = useState("missing_person");

  useEffect(() => {
    publicApi.searchFamily()
      .then((payload) => {
        const rows = (payload.data || []).map((item) => ({
          id: item.id,
          name: item.name,
          age: item.age,
          sex: item.sex,
          publicLocation: item.publicLocation,
          hospital: item.hospital,
          source: item.source || "RescateVZLA",
          type: item.type,
        }));
        setAllRows(rows);
        setStatus(rows.length ? "success" : "empty");
      })
      .catch(() => {
        setAllRows([]);
        setStatus("error");
      });
  }, []);

  const tabRows = allRows.filter((row) => row.type === activeTab);
  const columns = COLUMNS_BY_TAB[activeTab] || COLUMNS_BY_TAB.missing_person;
  const activeTabMeta = TABS.find((tab) => tab.key === activeTab);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Personas"
        subtitle="Desaparecidos, hospitalizados, rescatados y localizados con datos sensibles protegidos."
      />
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count = allRows.filter((row) => row.type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === tab.key ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {tab.label}{count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>
      {status === "error" && (
        <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>
      )}
      {status === "empty" && (
        <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>
      )}
      {status === "success" && tabRows.length === 0 && (
        <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">
          No hay {activeTabMeta?.label.toLowerCase()} registrados todavia.
        </div>
      )}
      {tabRows.length > 0 && <DataTable columns={columns} rows={tabRows} />}
    </div>
  );
}
