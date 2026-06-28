import SectionTitle from "../components/SectionTitle";

export default function Expenses() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Gastos y evidencias" subtitle="Auditoria visual de comprobantes, categorias, estados y zonas beneficiadas." />
      <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">
        Sin datos reales registrados todavía.
      </div>
    </div>
  );
}
