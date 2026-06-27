import {
  BarChart3,
  Building2,
  Globe2,
  HandCoins,
  LayoutDashboard,
  Map,
  Settings,
  ShieldCheck,
  Siren,
  UserCheck,
  Users,
} from "lucide-react";
import AdminVerification from "../pages/AdminVerification";
import Centers from "../pages/Centers";
import Dashboard from "../pages/Dashboard";
import DonationAudit from "../pages/DonationAudit";
import DonationsOverview from "../pages/DonationsOverview";
import Expenses from "../pages/Expenses";
import GovernmentPanel from "../pages/GovernmentPanel";
import InternationalPanel from "../pages/InternationalPanel";
import LiveMap from "../pages/LiveMap";
import MatchResults from "../pages/MatchResults";
import PersonDetail from "../pages/PersonDetail";
import PublishMissing from "../pages/PublishMissing";
import RegisterRescued from "../pages/RegisterRescued";
import ReportEmergency from "../pages/ReportEmergency";
import RescueLocation from "../pages/RescueLocation";
import RescuedList from "../pages/RescuedList";
import RescuersPanel from "../pages/RescuersPanel";
import SafeReport from "../pages/SafeReport";
import SearchFamily from "../pages/SearchFamily";
import VerifiedOrganizations from "../pages/VerifiedOrganizations";
import { permissions } from "../security/accessControl";

export const appRoutes = [
  { path: "/", label: "Inicio", navLabel: "Inicio", icon: LayoutDashboard, element: <Dashboard />, permission: permissions.VIEW_PUBLIC_DASHBOARD, priority: "public" },
  { path: "/mapa", label: "Mapa en vivo", navLabel: "Mapa", icon: Map, element: <LiveMap />, permission: permissions.VIEW_PUBLIC_DASHBOARD, priority: "operational" },
  { path: "/reportar", label: "Reportar emergencia", navLabel: "Reportar", icon: Siren, element: <ReportEmergency />, permission: permissions.REPORT_EMERGENCY, priority: "critical" },
  { path: "/estoy-a-salvo", label: "Estoy a salvo", element: <SafeReport />, permission: permissions.REPORT_SAFE, priority: "critical" },
  { path: "/buscar-familiar", label: "Buscar familiar", element: <SearchFamily />, permission: permissions.SEARCH_FAMILY, priority: "public" },
  { path: "/publicar-busqueda", label: "Publicar busqueda", element: <PublishMissing />, permission: permissions.SEARCH_FAMILY, priority: "public" },
  { path: "/registrar-rescatado", label: "Registrar rescatado", element: <RegisterRescued />, permission: permissions.MANAGE_RESCUED, priority: "restricted" },
  { path: "/ubicacion-rescate", label: "Ubicacion de rescate", element: <RescueLocation />, permission: permissions.VIEW_EXACT_LOCATION, priority: "restricted" },
  { path: "/personas", label: "Personas rescatadas", navLabel: "Personas", icon: Users, element: <RescuedList />, permission: permissions.VIEW_RESCUED_PUBLIC, priority: "operational" },
  { path: "/personas/:id", label: "Detalle de persona", element: <PersonDetail />, permission: permissions.VIEW_RESCUED_PUBLIC, priority: "sensitive" },
  { path: "/coincidencias", label: "Coincidencias", element: <MatchResults />, permission: permissions.SEARCH_FAMILY, priority: "sensitive" },
  { path: "/centros", label: "Centros", navLabel: "Centros", icon: Building2, element: <Centers />, permission: permissions.MANAGE_CENTERS, priority: "operational" },
  { path: "/rescatistas", label: "Rescatistas", navLabel: "Rescatistas", icon: ShieldCheck, element: <RescuersPanel />, permission: permissions.MANAGE_RESPONDERS, priority: "restricted" },
  { path: "/donaciones", label: "Donaciones", navLabel: "Donaciones", icon: HandCoins, element: <DonationsOverview />, permission: permissions.VIEW_DONATIONS, priority: "public" },
  { path: "/organizaciones", label: "Organizaciones", navLabel: "ONG", icon: UserCheck, element: <VerifiedOrganizations />, permission: permissions.VERIFY_ORGANIZATIONS, priority: "humanitarian" },
  { path: "/donacion/:id", label: "Auditoria de donacion", element: <DonationAudit />, permission: permissions.VIEW_DONATIONS, priority: "public" },
  { path: "/gastos", label: "Gastos", element: <Expenses />, permission: permissions.AUDIT_DONATIONS, priority: "audit" },
  { path: "/gobierno", label: "Gobierno", navLabel: "Gobierno", icon: BarChart3, element: <GovernmentPanel />, permission: permissions.VIEW_GOVERNMENT_PANEL, priority: "restricted" },
  { path: "/internacional", label: "Internacional", navLabel: "Global", icon: Globe2, element: <InternationalPanel />, permission: permissions.VIEW_INTERNATIONAL_PANEL, priority: "humanitarian" },
  { path: "/admin", label: "Administracion", navLabel: "Admin", icon: Settings, element: <AdminVerification />, permission: permissions.ADMINISTER_SYSTEM, priority: "restricted" },
];

export const navigationRoutes = appRoutes.filter((route) => route.icon);
