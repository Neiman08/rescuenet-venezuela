import SectionTitle from "../components/SectionTitle";
import MapPreview from "../components/MapPreview";
import { usePublicAffectedZones } from "../hooks/usePublicAffectedZones";

export default function RescueLocation() {
  const { zones } = usePublicAffectedZones();

  return (
    <div className="space-y-6">
      <SectionTitle title="Ubicacion del rescate" subtitle="Vista sensible: coordenadas exactas reservadas para rescatistas, gobierno y administradores." />
      <div className="card p-4 bg-blue-50 border-blue-100 text-blue-800 text-sm">
        Este modulo representa una vista restringida. En produccion debe requerir rol autorizado, razon de acceso y registro automatico en audit_logs.
      </div>
      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
        <div className="card p-5 h-[560px]"><MapPreview /></div>
        <div className="card p-5 space-y-4">
          <select className="input">
            <option value="">Seleccionar zona afectada</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.sector} — {z.state}</option>)}
          </select>
          <input className="input" placeholder="Coordenadas exactas protegidas" />
          <input className="input" placeholder="Equipo responsable" />
          <textarea className="input min-h-32" placeholder="Referencia fisica y riesgos de acceso" />
          <button className="btn bg-navy text-white w-full">Guardar ubicacion sensible</button>
        </div>
      </div>
    </div>
  );
}
