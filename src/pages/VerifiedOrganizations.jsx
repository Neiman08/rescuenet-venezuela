import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import { organizations } from "../data/mockData";

export default function VerifiedOrganizations() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Organizaciones verificadas" subtitle="Registro mock de ONG con representante, categorias, zonas de trabajo, cuenta y wallet preparadas." />
      <div className="grid md:grid-cols-4 gap-4">
        {organizations.map((org) => (
          <div key={org.id} className="card p-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">{org.name.slice(0, 2)}</div>
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
    </div>
  );
}
