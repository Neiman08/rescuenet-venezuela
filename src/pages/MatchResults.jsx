import SectionTitle from "../components/SectionTitle";

export default function MatchResults() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Coincidencias familiares" subtitle="Modulo preparado para revision institucional de coincidencias reales." />
      <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">
        No hay coincidencias verificadas registradas todavía.
      </div>
    </div>
  );
}
