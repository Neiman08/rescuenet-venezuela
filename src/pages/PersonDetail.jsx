import { Link, useParams } from "react-router-dom";
import { Lock, MapPin } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import StatusBadge from "../components/StatusBadge";
import { rescuedPeople } from "../data/mockData";

export default function PersonDetail() {
  const { id } = useParams();
  const person = rescuedPeople.find((item) => item.id === id) || rescuedPeople[0];
  return (
    <div className="space-y-6">
      <SectionTitle title={person.name} subtitle={`Codigo ${person.id} - ${person.rescuedAt}`} action={<Link to="/coincidencias" className="btn bg-rescueBlue text-white">Ver coincidencias</Link>} />
      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <div className="card p-5">
          <img className={`w-full aspect-square rounded-2xl object-cover ${person.isMinor ? "blur-md" : ""}`} src={person.image} alt="" />
          {person.isMinor && (
            <div className="mt-4 bg-navy text-white rounded-2xl p-4 flex gap-3">
              <Lock />
              <p className="text-sm">Foto y ubicacion exacta protegidas por tratarse de un menor.</p>
            </div>
          )}
        </div>
        <div className="card p-6 space-y-5">
          <div className="flex flex-wrap gap-3 items-center"><StatusBadge status={person.status} /><StatusBadge status={person.condition} /></div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <Info label="Edad" value={person.age} />
            <Info label="Sexo" value={person.gender} />
            <Info label="Consciente" value={person.conscious} />
            <Info label="Heridas" value={person.injuries} />
            <Info label="Senas particulares" value={person.signs} />
            <Info label="Ropa" value={person.clothing} />
            <Info label="Equipo de rescate" value={person.team} />
            <Info label="Responsable" value={person.rescuer} />
            <Info label="Trasladado a" value={person.currentPlace} />
            <Info label="Coordenadas" value={person.isMinor ? "Informacion protegida" : person.coordinates} />
          </div>
          <div>
            <h2 className="font-black mb-3 flex items-center gap-2"><MapPin size={18} /> Historial</h2>
            <div className="space-y-2">
              {person.history.map((item) => <p key={item} className="p-3 rounded-xl bg-slate-50 text-sm">{item}</p>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50">
      <p className="text-xs uppercase text-slate-400 font-bold">{label}</p>
      <p className="font-semibold mt-1">{value}</p>
    </div>
  );
}
