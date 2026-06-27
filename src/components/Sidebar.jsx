import { NavLink } from "react-router-dom";
import { HeartHandshake } from "lucide-react";
import { navigationRoutes } from "../config/routes";

function LinkItem({ link, compact = false }) {
  const Icon = link.icon;
  return (
    <NavLink
      to={link.path}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl text-sm transition ${
          compact ? "px-3 py-2 flex-col gap-1 text-[11px]" : "px-4 py-3"
        } ${isActive ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-white/10"}`
      }
    >
      <Icon size={compact ? 18 : 19} />
      <span>{link.navLabel || link.label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <>
      <aside className="hidden md:flex w-64 bg-navy text-white min-h-screen flex-col sticky top-0">
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <div className="w-11 h-11 rounded-2xl bg-rescueRed flex items-center justify-center">
            <HeartHandshake size={26} />
          </div>
          <div>
            <h1 className="font-black leading-5">RescueNet</h1>
            <p className="text-[11px] tracking-[0.25em] text-blue-100">VENEZUELA</p>
          </div>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {navigationRoutes.map((link) => (
            <LinkItem key={link.path} link={link} />
          ))}
        </nav>
        <div className="p-4">
          <NavLink to="/reportar" className="block text-center bg-rescueRed rounded-xl py-3 font-bold">
            REPORTAR EMERGENCIA
          </NavLink>
        </div>
      </aside>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-navy text-white grid grid-cols-5 gap-1 px-2 py-2">
        {navigationRoutes.slice(0, 5).map((link) => (
          <LinkItem key={link.path} link={link} compact />
        ))}
      </nav>
    </>
  );
}
