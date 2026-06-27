function normalizeApiBaseUrl(value) {
  const fallback = typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "https://rescuenet-backend-ndg5.onrender.com/api"
    : "http://localhost:4000/api";
  const raw = String(value || fallback).trim().replace(/\/+$/, "");
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL);

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const token = localStorage.getItem("rescuenet_access_token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(payload?.error?.message || "No pudimos completar la solicitud.", response.status, payload?.error?.details);
  }

  return payload;
}

export const publicApi = {
  createEmergency: (body) => request("/emergency", { method: "POST", body: JSON.stringify(body) }),
  createSafeReport: (body) => request("/safe", { method: "POST", body: JSON.stringify(body) }),
  createMissingReport: (body) => request("/missing", { method: "POST", body: JSON.stringify(body) }),
  createHelpCenter: (body) => request("/help-centers", { method: "POST", body: JSON.stringify(body) }),
  createLogisticsRequest: (body) => request("/logistics/public", { method: "POST", body: JSON.stringify(body) }),
  getEmergencies: () => request("/emergency/public"),
  getSafeReports: () => request("/safe/public"),
  getMissingReports: () => request("/missing/public"),
  getRescued: () => request("/rescued/public"),
  getHospitalized: () => request("/hospitalized/public"),
  getMap: () => request("/map/public"),
  getDashboard: () => request("/dashboard/public"),
  getAffectedZones: () => request("/affected-zones/public"),
  getHelpCenters: () => request("/help-centers/public"),
  getHospitals: () => request("/hospitals/public"),
  getShelters: () => request("/shelters/public"),
  getDonations: () => request("/donations/public"),
  searchFamily: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== "")).toString();
    return request(`/family-search/public${query ? `?${query}` : ""}`);
  },
};

export const institutionalApi = {
  runIngestion: () => request("/ingestion/run", { method: "POST" }),
  getIngestionRuns: () => request("/ingestion/runs"),
  manualUpload: (body) => request("/ingestion/manual-upload", { method: "POST", body: JSON.stringify(body) }),
  getIngestionRecords: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== "")).toString();
    return request(`/ingestion/records${query ? `?${query}` : ""}`);
  },
  approveIngestionRecord: (id) => request(`/ingestion/records/${id}/approve`, { method: "POST" }),
  approveIngestionRecords: (ids) => request("/ingestion/records/approve-many", { method: "POST", body: JSON.stringify({ ids }) }),
  approveFilteredIngestionRecords: (filters) => request("/ingestion/records/approve-filtered", { method: "POST", body: JSON.stringify({ filters }) }),
  rejectIngestionRecord: (id) => request(`/ingestion/records/${id}/reject`, { method: "POST" }),
  setIngestionRecordStatus: (id, verificationStatus) => request(`/ingestion/records/${id}/status`, { method: "PATCH", body: JSON.stringify({ verificationStatus }) }),
  markDuplicate: (id) => request(`/ingestion/records/${id}/mark-duplicate`, { method: "POST" }),
};

export function friendlyApiError(error) {
  if (error instanceof ApiError && error.status === 429) return "Hay muchas solicitudes en este momento. Intenta de nuevo en un minuto.";
  if (error instanceof ApiError && error.status === 400) return "Revisa los datos del formulario. Hay informacion incompleta o invalida.";
  if (error instanceof TypeError) return "No pudimos conectar con el servidor. Intenta de nuevo cuando tengas conexion.";
  return error.message || "Ocurrio un error inesperado.";
}
