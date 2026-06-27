import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { appRoutes } from "./config/routes";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {appRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
