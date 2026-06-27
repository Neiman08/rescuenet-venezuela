import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import LiveMap from "./pages/LiveMap";
import ReportEmergency from "./pages/ReportEmergency";
import SafeReport from "./pages/SafeReport";
import SearchFamily from "./pages/SearchFamily";
import PublishMissing from "./pages/PublishMissing";
import RegisterRescued from "./pages/RegisterRescued";
import RescueLocation from "./pages/RescueLocation";
import RescuedList from "./pages/RescuedList";
import PersonDetail from "./pages/PersonDetail";
import MatchResults from "./pages/MatchResults";
import Centers from "./pages/Centers";
import RescuersPanel from "./pages/RescuersPanel";
import DonationsOverview from "./pages/DonationsOverview";
import VerifiedOrganizations from "./pages/VerifiedOrganizations";
import DonationAudit from "./pages/DonationAudit";
import Expenses from "./pages/Expenses";
import GovernmentPanel from "./pages/GovernmentPanel";
import InternationalPanel from "./pages/InternationalPanel";
import AdminVerification from "./pages/AdminVerification";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/mapa" element={<LiveMap />} />
          <Route path="/reportar" element={<ReportEmergency />} />
          <Route path="/estoy-a-salvo" element={<SafeReport />} />
          <Route path="/buscar-familiar" element={<SearchFamily />} />
          <Route path="/publicar-busqueda" element={<PublishMissing />} />
          <Route path="/registrar-rescatado" element={<RegisterRescued />} />
          <Route path="/ubicacion-rescate" element={<RescueLocation />} />
          <Route path="/personas" element={<RescuedList />} />
          <Route path="/personas/:id" element={<PersonDetail />} />
          <Route path="/coincidencias" element={<MatchResults />} />
          <Route path="/centros" element={<Centers />} />
          <Route path="/rescatistas" element={<RescuersPanel />} />
          <Route path="/donaciones" element={<DonationsOverview />} />
          <Route path="/organizaciones" element={<VerifiedOrganizations />} />
          <Route path="/donacion/:id" element={<DonationAudit />} />
          <Route path="/gastos" element={<Expenses />} />
          <Route path="/gobierno" element={<GovernmentPanel />} />
          <Route path="/internacional" element={<InternationalPanel />} />
          <Route path="/admin" element={<AdminVerification />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
