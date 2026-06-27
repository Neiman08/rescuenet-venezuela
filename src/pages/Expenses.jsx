import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import { expenses } from "../data/mockData";

export default function Expenses() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Gastos y evidencias" subtitle="Auditoria visual de comprobantes, categorias, estados y zonas beneficiadas." />
      <DataTable columns={[
        { key: "date", label: "Fecha" },
        { key: "org", label: "Organizacion" },
        { key: "description", label: "Descripcion" },
        { key: "category", label: "Categoria" },
        { key: "amount", label: "Monto", render: (row) => `$${row.amount.toLocaleString()}` },
        { key: "receipt", label: "Comprobante" },
        { key: "zone", label: "Zona" },
        { key: "status", label: "Estado", badge: true },
      ]} rows={expenses} />
    </div>
  );
}
