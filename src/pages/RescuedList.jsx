import { Link } from "react-router-dom";
import { ShieldPlus } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

const groups = [
  { key: "missing", title: "Desaparecidos", loader: publicApi.getMissingReports },
  { key: "hospitalized", title: "Hospitalizados", loader: publicApi.getHospitalized },
  { key: "rescued", title: "Rescatados", loader: publicApi.getRescued },
  { key: "safe", title: "A salvo", loader: publicApi.getSafeReports },
];

function normalizePerson(item, fallbackType) {
  return {
    id: item.code || item.id,
    name: item.name || item.fullName || "Informacion protegida",
    type: item.type || item.recordType || fallbackType,
    age: item.age || item.approximateAge || "No indicada",
    sex: item.sex || item.gender || "No indicado",
    publicLocation: item.publicLocation || item.currentPlace || item.lastSeenPlace || item.zone || "Zona no indicada",
    hospital: item.hospital || item.hospitalName || "No indicado",
    status: item.status || item.verificationStatus || "Por verificar",
    privacy: item.privacyLevel === "restricted" ? "Protegido" : "PublicSafe",
  };
}

export default function RescuedList() {
  const [data, setData] = useState(Object.fromEntries(groups.map((group) => [group.key, []])));
  const [status, setStatus] = useState("loading");

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

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Personas"
        subtitle="Desaparecidos, hospitalizados, rescatados y personas a salvo con datos sensibles protegidos."
        action={<Link to="/registrar-rescatado" className="btn bg-rescueGreen text-white flex items-center gap-2"><ShieldPlus size={18} /> Registrar rescatado</Link>}
      />
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {status === "success" && total === 0 && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>}
      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black text-lg">{group.title}</h2>
            <span className="badge bg-blue-100 text-blue-700">{data[group.key]?.length || 0}</span>
          </div>
          {data[group.key]?.length ? (
            <DataTable
              columns={[
                { key: "id", label: "Codigo" },
                { key: "name", label: "Nombre" },
                { key: "age", label: "Edad" },
                { key: "sex", label: "Sexo" },
                { key: "publicLocation", label: "Zona publica" },
                { key: "hospital", label: "Hospital" },
                { key: "status", label: "Estado", badge: true },
                { key: "privacy", label: "Privacidad" },
              ]}
              rows={data[group.key]}
            />
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">No hay registros publicos en esta categoria.</div>
          )}
        </section>
      ))}
    </div>
  );
}
