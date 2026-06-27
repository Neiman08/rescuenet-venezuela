import { CheckCircle } from "lucide-react";
import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import { affectedZones } from "../data/affectedZones";

export default function SafeReport() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SectionTitle title="Estoy a salvo" subtitle="Registra tu estado para que familiares y coordinadores puedan ubicarte." />
      <PublicAccessNotice text="No necesitas crear cuenta para informar que estas a salvo." />
      <div className="card p-6 grid md:grid-cols-2 gap-4">
        <input className="input" placeholder="Nombre completo" />
        <input className="input" placeholder="Cedula o identificador opcional" />
        <input className="input" placeholder="Telefono de contacto" />
        <select className="input">{affectedZones.map((z) => <option key={z.id}>{z.sector} - {z.estado}</option>)}</select>
        <input className="input" placeholder="Lugar seguro actual" />
        <input className="input" placeholder="Familiares a notificar" />
        <textarea className="input md:col-span-2 min-h-28" placeholder="Mensaje breve para familiares" />
        <button className="btn bg-rescueGreen text-white md:col-span-2 flex items-center justify-center gap-2"><CheckCircle size={20} /> Informar a mi familia</button>
      </div>
    </div>
  );
}
