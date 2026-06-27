import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HandCoins, ReceiptText } from "lucide-react";
import DataTable from "../components/DataTable";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import { demoDataEnabled, noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { chartByZone, donations, expenses, stats } from "../data/mockData";
import { publicApi } from "../lib/api";

export default function DonationsOverview() {
  const [rows, setRows] = useState(demoDataEnabled ? donations : []);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    publicApi.getDonations()
      .then((payload) => {
        const nextRows = (payload.data || []).map((item) => ({
          id: item.code || item.id,
          donor: item.publicDonor ? "Donante publico" : "Anonimo",
          org: item.organization || "Organizacion",
          amount: item.amount,
          status: item.status,
          use: item.intendedUse || "Ayuda humanitaria",
          zone: item.affectedZone?.sector || "Zona nacional",
        }));
        if (nextRows.length) {
          setRows(nextRows);
          setStatus("success");
        } else {
          setRows(demoDataEnabled ? donations : []);
          setStatus(demoDataEnabled ? "fallback" : "empty");
        }
      })
      .catch(() => {
        setRows(demoDataEnabled ? donations : []);
        setStatus(demoDataEnabled ? "fallback" : "error");
      });
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle title="Donaciones auditables" subtitle="Panel publico con fondos recibidos, gastos, evidencias y beneficiarios estimados." action={<Link to="/gastos" className="btn bg-navy text-white">Ver gastos</Link>} />
      <PublicAccessNotice text="No necesitas crear cuenta para consultar donaciones publicas y auditoria resumida." />
      {status === "fallback" && <div className="rounded-2xl bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">No pudimos conectar con donaciones publicas del backend. Mostrando datos simulados locales.</div>}
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {status === "empty" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Total recibido" value={`$${stats.donationsReceived.toLocaleString()}`} color="green" icon={<HandCoins />} />
        <StatCard title="Total gastado" value={`$${stats.donationsSpent.toLocaleString()}`} color="orange" icon={<ReceiptText />} />
        <StatCard title="Pendiente" value={`$${stats.pendingFunds.toLocaleString()}`} color="blue" icon={<HandCoins />} />
        <StatCard title="ONG verificadas" value={stats.verifiedOrganizations} color="purple" icon={<ReceiptText />} />
      </div>
      <div className="grid xl:grid-cols-2 gap-6">
        <div className="card p-5 h-80">
          <h2 className="font-black mb-4">Ayuda por zona</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartByZone}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="zone" /><YAxis /><Tooltip /><Bar dataKey="emergencias" fill="#ef2b2d" /><Bar dataKey="rescatados" fill="#2563eb" /></BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5 h-80">
          <h2 className="font-black mb-4">Flujo auditado</h2>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={expenses}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="zone" /><YAxis /><Tooltip /><Area dataKey="amount" stroke="#16a34a" fill="#dcfce7" /></AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
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
    </div>
  );
}
