import { Link } from "react-router-dom";
import { ShieldPlus } from "lucide-react";
import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import { rescuedPeople } from "../data/mockData";

export default function RescuedList() {
  return (
    <div className="space-y-6">
      <SectionTitle
        title="Personas rescatadas"
        subtitle="Registro publico con resumen medico y ubicaciones sensibles protegidas."
        action={<Link to="/registrar-rescatado" className="btn bg-rescueGreen text-white flex items-center gap-2"><ShieldPlus size={18} /> Registrar rescatado</Link>}
      />
      <div className="grid md:grid-cols-3 gap-4">
        {rescuedPeople.map((person) => (
          <Link key={person.id} to={`/personas/${person.id}`} className="card p-4 hover:-translate-y-1 transition">
            <div className="flex gap-4">
              <div className="relative">
                <img className={`w-20 h-20 rounded-2xl object-cover ${person.isMinor ? "blur-sm" : ""}`} src={person.image} alt="" />
                {person.isMinor && <span className="absolute inset-x-1 bottom-1 text-[10px] bg-navy text-white rounded px-1 text-center">protegido</span>}
              </div>
              <div className="min-w-0">
                <p className="font-black">{person.name}</p>
                <p className="text-sm text-slate-500">{person.age} - {person.gender}</p>
                <p className="text-xs text-slate-500 mt-1">{person.rescuedAt}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <DataTable
        columns={[
          { key: "id", label: "Codigo" },
          { key: "name", label: "Nombre" },
          { key: "condition", label: "Condicion" },
          { key: "currentPlace", label: "Trasladado a" },
          { key: "status", label: "Estado", badge: true },
        ]}
        rows={rescuedPeople}
      />
    </div>
  );
}
