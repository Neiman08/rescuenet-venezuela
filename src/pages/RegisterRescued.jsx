import SectionTitle from "../components/SectionTitle";
import { affectedZones } from "../data/affectedZones";

export default function RegisterRescued() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionTitle title="Registrar rescatado" subtitle="Captura operativa para rescatistas, refugios y hospitales." />
      <div className="card p-6 grid md:grid-cols-2 gap-4">
        <input className="input" placeholder="Nombre o No identificado" />
        <input className="input" placeholder="Edad aproximada" />
        <select className="input"><option>Sexo</option><option>Femenino</option><option>Masculino</option></select>
        <select className="input"><option>Condicion</option><option>Estable</option><option>Delicado</option><option>Critico</option></select>
        <input className="input" placeholder="Heridas visibles" />
        <input className="input" placeholder="Senas particulares" />
        <input className="input" placeholder="Ropa" />
        <select className="input">{affectedZones.map((z) => <option key={z.id}>{z.sector} - {z.estado}</option>)}</select>
        <input className="input" placeholder="Equipo de rescate" />
        <input className="input" placeholder="Trasladado a" />
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" /> Es menor de edad</label>
        <input className="input" type="file" />
        <textarea className="input md:col-span-2 min-h-24" placeholder="Historial inicial" />
        <button className="btn bg-rescueGreen text-white md:col-span-2">Registrar persona rescatada</button>
      </div>
    </div>
  );
}
