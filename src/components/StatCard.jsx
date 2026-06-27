export default function StatCard({ title, value, change, color = "blue", icon }) {
  const colors = {
    red: "text-red-600 bg-red-50",
    green: "text-green-600 bg-green-50",
    blue: "text-blue-600 bg-blue-50",
    purple: "text-purple-600 bg-purple-50",
    orange: "text-orange-600 bg-orange-50",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="text-2xl md:text-3xl font-black mt-2 break-words">{value}</h3>
          {change && <p className="text-xs text-green-600 mt-2">{change}</p>}
        </div>
        {icon && <div className={`w-11 h-11 rounded-xl flex shrink-0 items-center justify-center ${colors[color]}`}>{icon}</div>}
      </div>
    </div>
  );
}
