import { Link } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import DataTable from "../components/DataTable";
import { rescuedPeople } from "../data/mockData";

export default function SearchFamily() {
  return (
    <div className="space-y-6">
      <SectionTitle
        title="Buscar familiar"
        subtitle="Busqueda publica con proteccion de datos sensibles para menores y ubicaciones exactas."
        action={<Link className="btn bg-rescueBlue text-white flex items-center gap-2" to="/publicar-busqueda"><UserPlus size={18} /> Publicar busqueda</Link>}
      />
      <PublicAccessNotice />
      <div className="card p-5 grid md:grid-cols-[1fr_auto] gap-4">
        <input className="input" placeholder="Nombre, senas particulares, zona o codigo RV" />
        <Link to="/coincidencias" className="btn bg-navy text-white flex items-center justify-center gap-2"><Search size={18} /> Ver coincidencias</Link>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "Codigo" },
          { key: "name", label: "Persona" },
          { key: "age", label: "Edad" },
          { key: "rescuedAt", label: "Zona publica" },
          { key: "status", label: "Estado", badge: true },
          { key: "privacy", label: "Privacidad", render: (row) => (row.isMinor ? "Informacion protegida" : "Resumen publico") },
        ]}
        rows={rescuedPeople}
      />
    </div>
  );
}
