import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HandCoins, ReceiptText } from "lucide-react";
import DataTable from "../components/DataTable";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

export default function DonationsOverview() {
  const [rows, setRows] = useState([]);
  const [dashStats, setDashStats] = useState({});
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.allSettled([publicApi.getDonations(), publicApi.getDashboard()])
      .then(([donationsResult, dashboardResult]) => {
        if (dashboardResult.status === "fulfilled") setDashStats(dashboardResult.value?.stats || {});
        if (donationsResult.status === "fulfilled") {
          const nextRows = (donationsResult.value?.data || []).map((item) => ({
            id: item.code || item.id,
            donor: item.publicDonor ? "Donante publico" : "Anonimo",
            org: item.organization || "Organizacion",
            amount: item.amount,
            status: item.status,
            use: item.intendedUse || "Ayuda humanitaria",
            zone: item.affectedZone?.sector || "Zona nacional",
          }));
          setRows(nextRows);
          setStatus(nextRows.length ? "success" : "empty");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle title="Donaciones auditables" subtitle="Panel publico con fondos recibidos, gastos, evidencias y beneficiarios estimados." action={<Link to="/gastos" className="btn bg-navy text-white">Ver gastos</Link>} />
      <PublicAccessNotice text="No necesitas crear cuenta para consultar donaciones publicas y auditoria resumida." />
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {status === "empty" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Rescatados" value={(dashStats.rescuedPeople || 0).toLocaleString()} color="green" icon={<HandCoins />} />
        <StatCard title="Hospitalizados" value={(dashStats.hospitalizedPeople || 0).toLocaleString()} color="blue" icon={<ReceiptText />} />
        <StatCard title="Centros activos" value={(dashStats.activeCenters || 0).toLocaleString()} color="purple" icon={<HandCoins />} />
        <StatCard title="Desaparecidos" value={(dashStats.missingPeople || 0).toLocaleString()} color="orange" icon={<ReceiptText />} />
      </div>
      {rows.length > 0 && (
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "donor", label: "Donante" },
            { key: "org", label: "Organizacion" },
            { key: "amount", label: "Monto", render: (row) => `$${row.amount}` },
            { key: "use", label: "Uso" },
            { key: "zone", label: "Zona" },
            { key: "status", label: "Estado", badge: true },
            { key: "detail", label: "Detalle", render: (row) => <Link className="text-blue-600 font-bold" to={`/donacion/${row.id}`}>Auditoria</Link> },
          ]}
          rows={rows}
        />
      )}
    </div>
  );
}
