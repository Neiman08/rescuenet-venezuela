import { Building2, Car, Droplet, HeartPulse, Home, Pill, Siren, UserRound, Utensils } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { affectedZones } from "../data/affectedZones";
import { emergencyTypes } from "../data/mockData";

const icons = [Siren, HeartPulse, UserRound, Droplet, Utensils, Pill, Home, Building2, Car];

export default function ReportEmergency() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionTitle title="Reportar emergencia" subtitle="Este reporte sera enviado a equipos de rescate y centros de coordinacion." />
      <div className="card p-6">
        <h2 className="font-black text-lg mb-4">Tipo de emergencia</h2>
        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {emergencyTypes.map((type, i) => {
            const Icon = icons[i] || Siren;
            return (
              <button key={type.id} className="p-5 rounded-2xl border border-slate-200 hover:border-red-400 hover:bg-red-50 text-center">
                <Icon className="mx-auto text-red-600 mb-3" />
                <span className="font-bold text-sm">{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="card p-6 grid md:grid-cols-2 gap-4">
        <input className="input" placeholder="Nombre de quien reporta" />
        <input className="input" placeholder="Telefono" />
        <select className="input">
          <option>Seleccionar zona afectada</option>
          {affectedZones.map((z) => <option key={z.id}>{z.sector} - {z.estado}</option>)}
        </select>
        <input className="input" placeholder="Direccion o referencia" />
        <input className="input" placeholder="Numero de personas afectadas" />
        <input className="input" type="file" />
        <textarea className="input md:col-span-2 min-h-32" placeholder="Descripcion de la emergencia" />
        <button className="btn bg-rescueRed text-white md:col-span-2">Enviar reporte de emergencia</button>
      </div>
    </div>
  );
}
