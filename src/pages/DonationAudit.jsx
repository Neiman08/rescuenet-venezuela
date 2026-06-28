import { useParams } from "react-router-dom";
import SectionTitle from "../components/SectionTitle";

export default function DonationAudit() {
  const { id } = useParams();
  return (
    <div className="space-y-6">
      <SectionTitle title={`Auditoria ${id || ""}`} subtitle="Trazabilidad publica de uso, evidencias y beneficiarios estimados." />
      <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">
        Sin datos reales registrados todavía.
      </div>
    </div>
  );
}
