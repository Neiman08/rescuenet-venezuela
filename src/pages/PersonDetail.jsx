import { Link } from "react-router-dom";
import SectionTitle from "../components/SectionTitle";

export default function PersonDetail() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Detalle de persona" subtitle="La informacion detallada solo esta disponible en revision institucional." />
      <div className="card p-6 space-y-4">
        <p className="text-sm font-semibold text-slate-700">
          No hay detalle publico disponible para este registro. Los codigos internos, documentos, contacto, ubicaciones exactas y datos medicos permanecen protegidos.
        </p>
        <Link to="/personas" className="btn bg-navy text-white inline-flex">Volver a personas rescatadas</Link>
      </div>
    </div>
  );
}
