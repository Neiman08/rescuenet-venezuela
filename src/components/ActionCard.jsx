import { Link } from "react-router-dom";

export default function ActionCard({ to, title, subtitle, icon, color }) {
  const colorMap = {
    red: "bg-rescueRed",
    green: "bg-rescueGreen",
    blue: "bg-rescueBlue",
    purple: "bg-rescuePurple",
  };
  return (
    <Link to={to} className={`${colorMap[color]} text-white rounded-2xl p-5 shadow-card flex flex-col gap-3 hover:scale-[1.02] transition min-h-40`}>
      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">{icon}</div>
      <div>
        <h3 className="font-black text-lg leading-tight">{title}</h3>
        <p className="text-sm text-white/80 mt-1">{subtitle}</p>
      </div>
    </Link>
  );
}
