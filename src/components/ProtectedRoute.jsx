import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Forbidden() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card p-8 max-w-md text-center space-y-4">
        <div className="flex justify-center text-slate-300"><ShieldAlert size={56} /></div>
        <div className="text-4xl font-black text-slate-200">403</div>
        <h2 className="font-black text-xl">Acceso restringido</h2>
        <p className="text-sm text-slate-500">Tu cuenta no tiene permisos para acceder a este modulo. Contacta al administrador del sistema si crees que esto es un error.</p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, requiredPermission }) {
  const { isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Forbidden />;
  }

  return children;
}
