import { BrainCircuit, ShieldCheck } from "lucide-react";
import DataTable from "../components/DataTable";
import SectionTitle from "../components/SectionTitle";
import { aiPipelines, aiSafetyRules } from "../data/aiContracts";

export default function AIReadiness() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Arquitectura IA" subtitle="Contratos preparados para triaje, deduplicacion y coincidencias sin automatizar decisiones sensibles." />
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="card p-5">
          <h2 className="font-black mb-4 flex items-center gap-2"><BrainCircuit size={20} /> Pipelines futuros</h2>
          <DataTable
            columns={[
              { key: "name", label: "Pipeline" },
              { key: "purpose", label: "Proposito" },
              { key: "humanReview", label: "Revision humana" },
            ]}
            rows={aiPipelines}
          />
        </div>
        <aside className="card p-5">
          <h2 className="font-black mb-4 flex items-center gap-2"><ShieldCheck size={20} /> Reglas de seguridad IA</h2>
          <div className="space-y-3">
            {aiSafetyRules.map((rule) => (
              <div key={rule} className="p-3 rounded-xl bg-slate-50 text-sm font-semibold">{rule}</div>
            ))}
          </div>
        </aside>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {aiPipelines.map((pipeline) => (
          <div key={pipeline.id} className="card p-5">
            <h3 className="font-black">{pipeline.name}</h3>
            <p className="text-xs uppercase font-bold text-slate-400 mt-4">Entradas</p>
            <p className="text-sm text-slate-600 mt-1">{pipeline.inputs.join(", ")}</p>
            <p className="text-xs uppercase font-bold text-slate-400 mt-4">Salidas</p>
            <p className="text-sm text-slate-600 mt-1">{pipeline.outputs.join(", ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
