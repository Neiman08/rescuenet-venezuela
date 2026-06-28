import { Link } from "react-router-dom";
import { Bell, Menu, Search } from "lucide-react";

export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button className="md:hidden p-2 rounded-lg bg-slate-100" aria-label="Menu">
          <Menu size={20} />
        </button>
        <div className="hidden lg:flex items-center bg-slate-100 rounded-xl px-3 py-2 w-96">
          <Search size={18} className="text-slate-400" />
          <input className="bg-transparent outline-none px-2 text-sm w-full" placeholder="Buscar persona, zona, refugio..." />
        </div>
        <span className="lg:hidden font-black text-navy truncate">RescateVZLA</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-xl bg-slate-100" aria-label="Alertas">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <Link to="/login" className="hidden sm:block bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
          Acceso ONG / Instituciones
        </Link>
      </div>
    </header>
  );
}
