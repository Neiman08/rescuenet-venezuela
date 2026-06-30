import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, CheckCircle, MessageCircle, Search, ShieldCheck, Siren, Users } from "lucide-react";
import ActionCard from "../components/ActionCard";
import StatCard from "../components/StatCard";
import MapPreview from "../components/MapPreview";
import StatusBadge from "../components/StatusBadge";
import { noApprovedDataMessage, noRealDataMessage } from "../config/demoData";
import { publicApi } from "../lib/api";

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState({});
  const [mapData, setMapData] = useState({ zones: [], reports: [] });
  const [helpCenters, setHelpCenters] = useState([]);
  const [urgentNeeds, setUrgentNeeds] = useState([]);
  const [status, setStatus] = useState("loading");
  const [familyQuery, setFamilyQuery] = useState("");

  function handleFamilySearch(e) {
    e.preventDefault();
    const value = familyQuery.trim();
    if (value) navigate(`/personas?q=${encodeURIComponent(value)}`);
    else navigate("/personas");
  }

  useEffect(() => {
    Promise.allSettled([publicApi.getDashboard(), publicApi.getMap(), publicApi.getHelpCenters()])
      .then(([dashboard, map, help]) => {
        if (dashboard.status === "fulfilled") setDashboardStats(dashboard.value.stats || {});
        if (map.status === "fulfilled") setMapData({ zones: map.value.zones || [], reports: map.value.reports || [] });
        if (help.status === "fulfilled") {
          const nextCenters = [
            ...(help.value.hospitals || []).map((item) => ({ ...item, type: "Hospital", zone: item.affectedZone?.sector || "Zona no indicada" })),
            ...(help.value.shelters || []).map((item) => ({ ...item, type: "Refugio", zone: item.affectedZone?.sector || "Zona no indicada" })),
            ...(help.value.imported || []).map((item) => ({ ...item, type: item.recordType, zone: item.publicLocation || item.zone || "Zona no indicada", capacity: item.capacity || 0, occupied: item.occupied || 0 })),
          ];
          setHelpCenters(nextCenters);
          setUrgentNeeds(nextCenters.filter((item) => item.recordType === "donation_need" || item.type === "donation_need").slice(0, 3));
        }
        const hasRealData = dashboard.status === "fulfilled" || map.status === "fulfilled" || help.status === "fulfilled";
        setStatus(hasRealData ? "success" : "error");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="space-y-6">
      {status === "error" && <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noRealDataMessage}</div>}
      {status === "success" && !Object.keys(dashboardStats).length && !mapData.zones.length && !helpCenters.length && (
        <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{noApprovedDataMessage}</div>
      )}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-3xl overflow-hidden bg-navy text-white shadow-card relative min-h-[460px]">
          <div className="absolute inset-0 opacity-25 bg-[url('https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&auto=format&fit=crop')] bg-cover bg-center" />
          <div className="relative p-6 md:p-8">
            <StatusBadge status="Datos reales" />
            <h1 className="text-3xl md:text-4xl font-black max-w-xl mt-4">Juntos salvamos vidas</h1>
            <p className="text-blue-100 mt-3 max-w-xl">
              Plataforma unificada de emergencia, rescate y ayuda humanitaria para las zonas afectadas por el terremoto.
            </p>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
              <ActionCard to="/reportar" color="red" title="Reportar emergencia" subtitle="Necesito ayuda urgente" icon={<Siren />} />
              <ActionCard to="/estoy-a-salvo" color="green" title="Estoy a salvo" subtitle="Informar a mi familia" icon={<CheckCircle />} />
              <ActionCard to="/personas" color="blue" title="Buscar familiar" subtitle="Buscar persona" icon={<Users />} />
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
          <div className="mt-5 space-y-3">
            <Link to="/mapa" className="btn bg-blue-600 text-white block text-center">Ver mapa en vivo</Link>
            <Link to="/operaciones" className="btn bg-navy text-white block text-center">Centro de operaciones</Link>
            <Link to="/logistica" className="btn bg-rescuePurple text-white block text-center">Logistica humanitaria</Link>
            <Link to="/donaciones" className="btn bg-green-600 text-white block text-center">Donar con auditoria</Link>
          </div>
        </div>
      </section>

      {/* ── Buscador familiar ─────────────────────────────────────────────── */}
      <section className="card p-5">
        <h2 className="font-black text-lg mb-1">¿Buscas a un familiar?</h2>
        <p className="text-sm text-slate-500 mb-4">
          Verifica si una persona está registrada como desaparecida, hospitalizada, rescatada o a salvo.
        </p>
        <form onSubmit={handleFamilySearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
              value={familyQuery}
              onChange={(e) => setFamilyQuery(e.target.value)}
              placeholder="Nombre, apellido, cédula o pasaporte"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn bg-navy text-white flex items-center justify-center gap-2">
            <Search size={16} /> Buscar persona
          </button>
        </form>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Desaparecidos" value={(dashboardStats.missingPeople || 0).toLocaleString()} color="red" icon={<Siren />} />
        <StatCard title="Hospitalizados" value={(dashboardStats.hospitalizedPeople || 0).toLocaleString()} color="blue" icon={<ShieldCheck />} />
        <StatCard title="Rescatados" value={(dashboardStats.rescuedPeople || 0).toLocaleString()} color="green" icon={<CheckCircle />} />
        <StatCard title="Centros activos" value={(dashboardStats.activeCenters || 0).toLocaleString()} color="purple" icon={<Building2 />} />
        <StatCard title="Reportes pendientes" value={(dashboardStats.pendingReports || 0).toLocaleString()} color="orange" icon={<Siren />} />
        <StatCard title="Incidentes criticos" value={(dashboardStats.criticalIncidents || 0).toLocaleString()} color="red" icon={<ShieldCheck />} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-5 h-[430px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-lg">Mapa de situacion</h2>
            <Link to="/mapa" className="text-blue-600 text-sm font-bold">Ver mapa completo</Link>
          </div>
          <MapPreview zonesData={mapData.zones} reports={mapData.reports} />
        </div>
        <div className="card p-5">
          <h2 className="font-black text-lg mb-4">Necesidades urgentes</h2>
          <div className="space-y-4">
            {urgentNeeds.length ? urgentNeeds.map((need) => (
              <div key={need.id || need.name} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                <div className="flex-1">
                  <p className="font-bold">{need.name || need.itemType || "Necesidad urgente"}</p>
                  <p className="text-xs text-slate-500">{need.publicLocation || need.zone}</p>
                </div>
                <span className="text-xs font-bold text-red-600">{need.priority || need.operationalStatus || "Pendiente"}</span>
              </div>
            )) : <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">{noApprovedDataMessage}</div>}
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        {helpCenters.map((center) => (
          <div key={center.name} className="card p-5">
            <h3 className="font-black">{center.name}</h3>
            <p className="text-sm text-slate-500">{center.type} - {center.zone}</p>
            {center.capacity ? (
              <>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${(center.occupied / center.capacity) * 100}%` }} />
                </div>
                <p className="text-xs mt-2">{center.occupied}/{center.capacity} ocupados</p>
              </>
            ) : <p className="text-xs mt-2">{center.operationalStatus || "Por revisar"}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}
