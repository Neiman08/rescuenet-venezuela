import DataTable from "../components/DataTable";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import { centers } from "../data/mockData";

export default function Centers() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Centros de ayuda" subtitle="Refugios, hospitales y centros de acopio vinculados a zonas afectadas." />
      <PublicAccessNotice text="No necesitas crear cuenta para consultar refugios, hospitales o centros de ayuda." />
      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        {centers.map((center) => (
          <div className="card p-5" key={center.name}>
            <h2 className="font-black">{center.name}</h2>
            <p className="text-sm text-slate-500">{center.type} - {center.zone}</p>
            <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-rescueBlue" style={{ width: `${Math.round((center.occupied / center.capacity) * 100)}%` }} />
            </div>
            <p className="text-xs mt-2">{center.occupied} de {center.capacity}</p>
          </div>
        ))}
      </div>
      <DataTable columns={[
        { key: "name", label: "Centro" },
        { key: "type", label: "Tipo" },
        { key: "zone", label: "Zona" },
        { key: "capacity", label: "Capacidad" },
        { key: "occupied", label: "Ocupados" },
        { key: "status", label: "Estado", badge: true },
      ]} rows={centers} />
    </div>
  );
}
