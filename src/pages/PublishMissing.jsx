import PublicAccessNotice from "../components/PublicAccessNotice";
import SectionTitle from "../components/SectionTitle";
import { affectedZones } from "../data/affectedZones";

export default function PublishMissing() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionTitle title="Publicar busqueda familiar" subtitle="Formulario mock preparado para fotos, documentos opcionales y consentimiento." />
      <PublicAccessNotice text="No necesitas crear cuenta para reportar una persona desaparecida." />
      <div className="card p-6 grid md:grid-cols-2 gap-4">
        <input className="input" placeholder="Nombre completo de la persona buscada" />
        <input className="input" placeholder="Edad" />
        <input className="input" placeholder="Cedula opcional" />
        <select className="input"><option>Sexo</option><option>Femenino</option><option>Masculino</option><option>No especificado</option></select>
        <input className="input" type="file" />
        <input className="input" type="file" multiple />
        <textarea className="input md:col-span-2 min-h-24" placeholder="Senas particulares" />
        <input className="input" placeholder="Ropa que llevaba" />
        <input className="input" placeholder="Ultimo lugar donde fue visto" />
        <select className="input">{affectedZones.map((z) => <option key={z.id}>{z.sector} - {z.estado}</option>)}</select>
        <input className="input" placeholder="Fecha y hora aproximada" />
        <input className="input" placeholder="Nombre del familiar que reporta" />
        <input className="input" placeholder="Parentesco y telefono" />
        <label className="md:col-span-2 flex items-center gap-3 text-sm"><input type="checkbox" /> Autorizo busqueda publica con proteccion de documentos y datos sensibles.</label>
        <button className="btn bg-rescueBlue text-white md:col-span-2">Publicar busqueda</button>
      </div>
    </div>
  );
}
