import { useParams } from "react-router-dom";
import SectionTitle from "../components/SectionTitle";
import StatusBadge from "../components/StatusBadge";
import { donations, expenses } from "../data/mockData";

export default function DonationAudit() {
  const { id } = useParams();
  const donation = donations.find((item) => item.id === id) || donations[0];
  return (
    <div className="space-y-6">
      <SectionTitle title={`Auditoria ${donation.id}`} subtitle="Trazabilidad publica de uso, evidencias y beneficiarios estimados." />
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="card p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Info label="Donante" value={donation.donor} />
            <Info label="Organizacion" value={donation.org} />
            <Info label="Monto" value={`$${donation.amount}`} />
            <Info label="Metodo" value={donation.method} />
            <Info label="Zona beneficiada" value={donation.zone} />
            <Info label="Beneficiarios estimados" value={donation.beneficiaries} />
          </div>
          <div className="p-4 rounded-2xl bg-slate-50">
            <h2 className="font-black">Uso declarado</h2>
            <p className="text-sm text-slate-600 mt-1">{donation.use}</p>
          </div>
        </div>
        <aside className="card p-5">
          <StatusBadge status={donation.status} />
          <h2 className="font-black mt-5 mb-3">Evidencias</h2>
          {expenses.slice(0, 3).map((expense) => (
            <div key={expense.description} className="p-3 rounded-xl bg-slate-50 mb-3">
              <p className="font-bold">{expense.description}</p>
              <p className="text-xs text-slate-500">{expense.receipt}</p>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="p-4 rounded-2xl bg-slate-50"><p className="text-xs uppercase text-slate-400 font-bold">{label}</p><p className="font-black mt-1">{value}</p></div>;
}
