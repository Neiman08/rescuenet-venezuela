import SectionTitle from "../components/SectionTitle";
import StatusBadge from "../components/StatusBadge";
import { matches, rescuedPeople } from "../data/mockData";

export default function MatchResults() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Coincidencias familiares" subtitle="Comparacion visual mock por zona, edad y senas particulares." />
      <div className="grid lg:grid-cols-2 gap-6">
        {matches.map((match) => {
          const person = rescuedPeople.find((item) => item.id === match.rescued);
          return (
            <div key={match.id} className="card p-5">
              <div className="flex justify-between gap-4">
                <div>
                  <h2 className="font-black text-xl">{match.searched}</h2>
                  <p className="text-sm text-slate-500">Posible rescatado: {match.rescued}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-rescueBlue">{match.score}%</p>
                  <p className="text-xs text-slate-500">coincidencia</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="aspect-square rounded-2xl bg-slate-100 flex items-center justify-center text-sm text-slate-500">Foto familiar</div>
                <img className={`aspect-square rounded-2xl object-cover ${person?.isMinor ? "blur-sm" : ""}`} src={person?.image} alt="" />
              </div>
              <div className="grid sm:grid-cols-3 gap-3 mt-5">
                <Info label="Zona" value={match.zone} />
                <Info label="Edad" value={match.age} />
                <Info label="Senas" value={match.signs} />
              </div>
              <button className="btn bg-navy text-white w-full mt-5">Solicitar verificacion</button>
              <div className="mt-3"><StatusBadge status={match.status} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="p-3 rounded-xl bg-slate-50 text-sm"><p className="text-slate-500">{label}</p><strong>{value}</strong></div>;
}
