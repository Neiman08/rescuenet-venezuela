import {
  BarChart3,
  BrainCircuit,
  Building2,
  Globe2,
  HandCoins,
  LayoutDashboard,
  Map,
  PackageCheck,
  Radio,
  Settings,
  ShieldCheck,
  Siren,
  UserCheck,
  Users,
} from "lucide-react";
import AdminRedayuda from "../pages/AdminRedayuda";
import AdminVerification from "../pages/AdminVerification";
import AIReadiness from "../pages/AIReadiness";
import CitizenReports from "../pages/CitizenReports";
import Centers from "../pages/Centers";
import Dashboard from "../pages/Dashboard";
import DonationAudit from "../pages/DonationAudit";
import DonationsOverview from "../pages/DonationsOverview";
import EmergencyOperations from "../pages/EmergencyOperations";
import Expenses from "../pages/Expenses";
import GovernmentPanel from "../pages/GovernmentPanel";
import HumanitarianLogistics from "../pages/HumanitarianLogistics";
import InstitutionalIngestionReview from "../pages/InstitutionalIngestionReview";
import InternationalPanel from "../pages/InternationalPanel";
import LiveMap from "../pages/LiveMap";
import Login from "../pages/Login";
import MatchResults from "../pages/MatchResults";
import PersonDetail from "../pages/PersonDetail";
import PersonasPage from "../pages/PersonasPage";
import PublishMissing from "../pages/PublishMissing";
import RegisterRescued from "../pages/RegisterRescued";
import ReportEmergency from "../pages/ReportEmergency";
import RescueLocation from "../pages/RescueLocation";
import RescuersPanel from "../pages/RescuersPanel";
import SafeReport from "../pages/SafeReport";
import SearchFamily from "../pages/SearchFamily";
import VerifiedOrganizations from "../pages/VerifiedOrganizations";
import { permissions } from "../security/accessControl";

// Backend permission strings (must match PERMISSIONS in backend/src/auth/permissions.js)
export const PERM = {
  DONATIONS_READ: "donations:read",
  ORGANIZATIONS_MANAGE: "organizations:manage",
  LOGISTICS_MANAGE: "logistics:manage",
  SYSTEM_ADMIN: "system:admin",
  AUDIT_READ: "audit:read",
  RESCUED_WRITE: "rescued:write",
  EXACT_LOCATION: "map:read",
  RESPONDERS: "map:read",
  INGESTION: "ingestion:manage",
};

export const appRoutes = [
  // ── Public routes ─────────────────────────────────────────────────────────
  { path: "/", label: "Inicio", navLabel: "Inicio", icon: LayoutDashboard, element: <Dashboard />, priority: "public" },
  { path: "/login", label: "Acceso institucional", element: <Login />, priority: "public" },
  { path: "/mapa", label: "Mapa en vivo", navLabel: "Mapa", icon: Map, element: <LiveMap />, priority: "public" },
  { path: "/operaciones", label: "Centro de operaciones", navLabel: "Operaciones", icon: Radio, element: <EmergencyOperations />, priority: "public" },
  { path: "/reportar", label: "Reportar emergencia", navLabel: "Reportar", icon: Siren, element: <ReportEmergency />, priority: "public" },
  { path: "/estoy-a-salvo", label: "Estoy a salvo", element: <SafeReport />, priority: "public" },
  { path: "/buscar-familiar", label: "Buscar familiar", element: <SearchFamily />, priority: "public" },
  { path: "/publicar-busqueda", label: "Publicar busqueda", element: <PublishMissing />, priority: "public" },
  { path: "/personas", label: "Personas", navLabel: "Personas", icon: Users, element: <PersonasPage />, priority: "public" },
  { path: "/personas/:id", label: "Detalle de persona", element: <PersonDetail />, priority: "public" },
  { path: "/centros", label: "Centros", navLabel: "Centros", icon: Building2, element: <Centers />, priority: "public" },
  { path: "/gobierno", label: "Gobierno", navLabel: "Gobierno", icon: BarChart3, element: <GovernmentPanel />, priority: "public" },

  // ── Protected routes ───────────────────────────────────────────────────────
  { path: "/logistica", label: "Logistica humanitaria", navLabel: "Logistica", icon: PackageCheck, element: <HumanitarianLogistics />, priority: "humanitarian", protected: true, requiredPermission: PERM.LOGISTICS_MANAGE },
  { path: "/rescatistas", label: "Rescatistas", navLabel: "Rescatistas", icon: ShieldCheck, element: <RescuersPanel />, priority: "restricted", protected: true, requiredPermission: PERM.RESPONDERS },
  { path: "/donaciones", label: "Donaciones", navLabel: "Donaciones", icon: HandCoins, element: <DonationsOverview />, priority: "restricted", protected: true, requiredPermission: PERM.DONATIONS_READ },
  { path: "/organizaciones", label: "Organizaciones", navLabel: "ONG", icon: UserCheck, element: <VerifiedOrganizations />, priority: "restricted", protected: true, requiredPermission: PERM.ORGANIZATIONS_MANAGE },
  { path: "/donacion/:id", label: "Auditoria de donacion", element: <DonationAudit />, priority: "restricted", protected: true, requiredPermission: PERM.DONATIONS_READ },
  { path: "/gastos", label: "Gastos", element: <Expenses />, priority: "restricted", protected: true, requiredPermission: PERM.AUDIT_READ },
  { path: "/internacional", label: "Internacional", navLabel: "Global", icon: Globe2, element: <InternationalPanel />, priority: "restricted", protected: true, requiredPermission: PERM.LOGISTICS_MANAGE },
  { path: "/ia", label: "Arquitectura IA", navLabel: "IA", icon: BrainCircuit, element: <AIReadiness />, priority: "restricted", protected: true, requiredPermission: PERM.SYSTEM_ADMIN },
  { path: "/admin", label: "Administracion", navLabel: "Admin", icon: Settings, element: <AdminVerification />, priority: "restricted", protected: true, requiredPermission: PERM.SYSTEM_ADMIN },
  { path: "/admin/ingesta", label: "Ingesta institucional", element: <InstitutionalIngestionReview />, priority: "restricted", protected: true, requiredPermission: PERM.INGESTION },
  { path: "/admin/reportes", label: "Reportes ciudadanos", element: <CitizenReports />, priority: "restricted", protected: true, requiredPermission: PERM.SYSTEM_ADMIN },
  { path: "/admin/redayuda", label: "Admin Redayuda", element: <AdminRedayuda />, priority: "restricted", protected: true, requiredPermission: PERM.SYSTEM_ADMIN },
  { path: "/coincidencias", label: "Coincidencias", element: <MatchResults />, priority: "restricted", protected: true },
  { path: "/registrar-rescatado", label: "Registrar rescatado", element: <RegisterRescued />, priority: "restricted", protected: true, requiredPermission: PERM.RESCUED_WRITE },
  { path: "/ubicacion-rescate", label: "Ubicacion de rescate", element: <RescueLocation />, priority: "restricted", protected: true, requiredPermission: PERM.EXACT_LOCATION },
];

// Only routes with icons appear in the sidebar nav
export const navigationRoutes = appRoutes.filter((route) => route.icon);

// Only public nav routes (shown to unauthenticated users)
export const publicNavigationRoutes = navigationRoutes.filter((route) => !route.protected);

// The old permission field is kept in accessControl.js but nav enforcement
// now uses the `protected` flag + ProtectedRoute component in App.jsx
void permissions;
