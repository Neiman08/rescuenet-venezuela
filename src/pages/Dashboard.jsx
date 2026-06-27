import { Link } from "react-router-dom";
import { Building2, CheckCircle, Droplet, MessageCircle, Pill, ShieldCheck, Siren, Utensils, Users } from "lucide-react";
import ActionCard from "../components/ActionCard";
import StatCard from "../components/StatCard";
import MapPreview from "../components/MapPreview";
import StatusBadge from "../components/StatusBadge";
import { centers, simulationNotice, stats } from "../data/mockData";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-3xl overflow-hidden bg-navy text-white shadow-card relative min-h-[460px]">
          <div className="absolute inset-0 opacity-25 bg-[url('https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&auto=format&fit=crop')] bg-cover bg-center" />
          <div className="relative p-6 md:p-8">
            <StatusBadge status="Simulada" />
            <h1 className="text-3xl md:text-4xl font-black max-w-xl mt-4">Juntos salvamos vidas</h1>
            <p className="text-blue-100 mt-3 max-w-xl">
              Plataforma unificada de emergencia, rescate y ayuda humanitaria para las zonas afectadas por el terremoto.
            </p>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
              <ActionCard to="/reportar" color="red" title="Reportar emergencia" subtitle="Necesito ayuda urgente" icon={<Siren />} />
              <ActionCard to="/estoy-a-salvo" color="green" title="Estoy a salvo" subtitle="Informar a mi familia" icon={<CheckCircle />} />
              <ActionCard to="/buscar-familiar" color="blue" title="Buscar familiar" subtitle="Buscar persona" icon={<Users />} />
              <ActionCard to="/centros" color="purple" title="Centros de ayuda" subtitle="Refugios y hospitales" icon={<Building2 />} />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-black text-lg mb-4">Alerta oficial</h2>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-700 text-sm">
            Replicas sismicas podrian continuar. Mantengase informado solo por canales verificados.
          </div>
          <div className="mt-4 rounded-2xl bg-green-50 border border-green-100 p-4">
            <div className="flex items-center gap-2 font-black text-green-700">
              <MessageCircle size={20} />
              Reporta por WhatsApp
            </div>
            <p className="text-xs text-green-700/80 mt-2">
              Futuro bot para emergencias, ubicacion, fotos, audio, busqueda familiar, estado seguro y refugios cercanos.
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-4">{simulationNotice}</p>
          <div className="mt-5 space-y-3">
            <Link to="/mapa" className="btn bg-blue-600 text-white block text-center">Ver mapa en vivo</Link>
            <Link to="/operaciones" className="btn bg-navy text-white block text-center">Centro de operaciones</Link>
            <Link to="/logistica" className="btn bg-rescuePurple text-white block text-center">Logistica humanitaria</Link>
            <Link to="/donaciones" className="btn bg-green-600 text-white block text-center">Donar con auditoria</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Emergencias activas" value={stats.activeEmergencies.toLocaleString()} color="red" icon={<Siren />} change="+120 ultimas horas" />
        <StatCard title="Personas rescatadas" value={stats.rescuedPeople.toLocaleString()} color="green" icon={<ShieldCheck />} change="+86 ultimas horas" />
        <StatCard title="Personas a salvo" value={stats.safePeople.toLocaleString()} color="blue" icon={<CheckCircle />} change="+210 ultimas horas" />
        <StatCard title="Centros operativos" value={stats.activeCenters} color="purple" icon={<Building2 />} change="Actualizado hace 2 min" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-5 h-[430px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-lg">Mapa de situacion</h2>
            <Link to="/mapa" className="text-blue-600 text-sm font-bold">Ver mapa completo</Link>
          </div>
          <MapPreview />
        </div>
        <div className="card p-5">
          <h2 className="font-black text-lg mb-4">Necesidades urgentes</h2>
          <div className="space-y-4">
            {[
              ["Agua potable", "Los Teques, La Vega", Droplet, "text-blue-600"],
              ["Medicinas", "Maracay, Valencia", Pill, "text-purple-600"],
              ["Alimentos", "Refugios activos", Utensils, "text-orange-600"],
            ].map(([title, zone, Icon, className]) => (
              <div key={title} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center">
                  <Icon className={className} />
                </div>
                <div className="flex-1">
                  <p className="font-bold">{title}</p>
                  <p className="text-xs text-slate-500">{zone}</p>
                </div>
                <span className="text-xs font-bold text-red-600">Muy urgente</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        {centers.map((center) => (
          <div key={center.name} className="card p-5">
            <h3 className="font-black">{center.name}</h3>
            <p className="text-sm text-slate-500">{center.type} - {center.zone}</p>
            <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: `${(center.occupied / center.capacity) * 100}%` }} />
            </div>
            <p className="text-xs mt-2">{center.occupied}/{center.capacity} ocupados</p>
          </div>
        ))}
      </section>
    </div>
  );
}
