import { createContext, useCallback, useContext, useState } from "react";

const AuthContext = createContext(null);

const API_BASE = (() => {
  const raw = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
  if (raw) return raw.endsWith("/api") ? raw : `${raw}/api`;
  if (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return "https://rescuenet-backend-ndg5.onrender.com/api";
  }
  return "http://localhost:4000/api";
})();

function decodeJwt(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part));
  } catch {
    return null;
  }
}

function loadSession() {
  const token = localStorage.getItem("rescuenet_access_token");
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
    localStorage.removeItem("rescuenet_access_token");
    return null;
  }
  return { token, roles: payload.roles || [], permissions: payload.permissions || [], sub: payload.sub };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);

  const login = useCallback(async ({ email, password }) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Credenciales invalidas");
    localStorage.setItem("rescuenet_access_token", data.accessToken);
    const payload = decodeJwt(data.accessToken);
    setSession({ token: data.accessToken, roles: payload?.roles || [], permissions: payload?.permissions || [], sub: payload?.sub });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("rescuenet_access_token");
    setSession(null);
  }, []);

  const isAuthenticated = Boolean(session);
  const hasPermission = (perm) => session?.permissions?.includes(perm) ?? false;
  const hasRole = (role) => session?.roles?.includes(role) ?? false;

  return (
    <AuthContext.Provider value={{ session, isAuthenticated, hasPermission, hasRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
