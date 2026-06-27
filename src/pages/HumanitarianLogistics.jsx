import { Boxes, ClipboardList, PackageCheck, Truck } from "lucide-react";
import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import { aidRequests, deliveries, inventoryLots, logisticsSummary, supplyCategories } from "../data/humanitarianLogistics";

export default function HumanitarianLogistics() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Logistica humanitaria" subtitle="Inventario, solicitudes y entregas para refugios, hospitales, ONG y voluntarios." />

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Lotes disponibles" value={logisticsSummary.availableLots} color="green" icon={<Boxes />} />
        <StatCard title="Solicitudes criticas" value={logisticsSummary.criticalRequests} color="red" icon={<ClipboardList />} />
        <StatCard title="Entregas activas" value={logisticsSummary.activeDeliveries} color="blue" icon={<Truck />} />
        <StatCard title="Personas cubiertas" value={logisticsSummary.peopleCovered.toLocaleString()} color="purple" icon={<PackageCheck />} />
      </div>

      <div className="card p-5">
        <h2 className="font-black mb-4">Categorias prioritarias</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {supplyCategories.map((category) => (
            <button key={category} className="p-4 rounded-2xl bg-slate-50 font-bold text-left hover:bg-blue-50 hover:text-blue-700">{category}</button>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-black mb-4">Solicitudes de ayuda</h2>
          <DataTable
            columns={[
              { key: "id", label: "ID" },
              { key: "requester", label: "Solicitante" },
              { key: "zone", label: "Zona" },
              { key: "category", label: "Categoria" },
              { key: "priority", label: "Prioridad" },
              { key: "people", label: "Personas" },
              { key: "status", label: "Estado", badge: true },
            ]}
            rows={aidRequests}
          />
        </div>

        <div className="card p-5">
          <h2 className="font-black mb-4">Entregas y trazabilidad</h2>
          <DataTable
            columns={[
              { key: "id", label: "Entrega" },
              { key: "destination", label: "Destino" },
              { key: "carrier", label: "Responsable" },
              { key: "eta", label: "ETA" },
              { key: "status", label: "Estado" },
              { key: "evidence", label: "Evidencia" },
            ]}
            rows={deliveries}
          />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-black mb-4">Inventario por lote</h2>
        <DataTable
          columns={[
            { key: "id", label: "Lote" },
            { key: "item", label: "Articulo" },
            { key: "category", label: "Categoria" },
            { key: "quantity", label: "Cantidad", render: (row) => `${row.quantity.toLocaleString()} ${row.unit}` },
            { key: "zone", label: "Zona" },
            { key: "center", label: "Centro" },
            { key: "status", label: "Estado", badge: true },
          ]}
          rows={inventoryLots}
        />
      </div>
    </div>
  );
}
