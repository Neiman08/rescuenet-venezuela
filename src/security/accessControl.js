import { roleCatalog } from "../data/roles";

export const permissions = {
  VIEW_PUBLIC_DASHBOARD: "view_public_dashboard",
  REPORT_EMERGENCY: "report_emergency",
  REPORT_SAFE: "report_safe",
  SEARCH_FAMILY: "search_family",
  VIEW_RESCUED_PUBLIC: "view_rescued_public",
  MANAGE_RESCUED: "manage_rescued",
  VIEW_EXACT_LOCATION: "view_exact_location",
  MANAGE_CENTERS: "manage_centers",
  MANAGE_RESPONDERS: "manage_responders",
  VIEW_DONATIONS: "view_donations",
  AUDIT_DONATIONS: "audit_donations",
  VERIFY_ORGANIZATIONS: "verify_organizations",
  VIEW_GOVERNMENT_PANEL: "view_government_panel",
  VIEW_INTERNATIONAL_PANEL: "view_international_panel",
  ADMINISTER_SYSTEM: "administer_system",
  VIEW_AUDIT_LOGS: "view_audit_logs",
};

export const rolePermissions = {
  publico: [
    permissions.VIEW_PUBLIC_DASHBOARD,
    permissions.REPORT_EMERGENCY,
    permissions.REPORT_SAFE,
    permissions.SEARCH_FAMILY,
    permissions.VIEW_RESCUED_PUBLIC,
    permissions.VIEW_DONATIONS,
  ],
  victima: [
    permissions.VIEW_PUBLIC_DASHBOARD,
    permissions.REPORT_EMERGENCY,
    permissions.REPORT_SAFE,
    permissions.SEARCH_FAMILY,
  ],
  familiar: [
    permissions.VIEW_PUBLIC_DASHBOARD,
    permissions.SEARCH_FAMILY,
    permissions.VIEW_RESCUED_PUBLIC,
    permissions.REPORT_EMERGENCY,
  ],
  rescatista: [
    permissions.REPORT_EMERGENCY,
    permissions.MANAGE_RESCUED,
    permissions.VIEW_EXACT_LOCATION,
    permissions.MANAGE_RESPONDERS,
    permissions.VIEW_RESCUED_PUBLIC,
  ],
  coordinador_rescate: [
    permissions.MANAGE_RESCUED,
    permissions.VIEW_EXACT_LOCATION,
    permissions.MANAGE_RESPONDERS,
    permissions.MANAGE_CENTERS,
    permissions.VIEW_AUDIT_LOGS,
  ],
  refugio: [permissions.MANAGE_CENTERS, permissions.MANAGE_RESCUED, permissions.VIEW_RESCUED_PUBLIC],
  hospital: [permissions.MANAGE_CENTERS, permissions.MANAGE_RESCUED, permissions.VIEW_RESCUED_PUBLIC],
  ong: [permissions.VIEW_DONATIONS, permissions.MANAGE_CENTERS],
  donante: [permissions.VIEW_DONATIONS],
  gobierno: [
    permissions.VIEW_GOVERNMENT_PANEL,
    permissions.VIEW_EXACT_LOCATION,
    permissions.MANAGE_RESPONDERS,
    permissions.VIEW_AUDIT_LOGS,
  ],
  organizacion_internacional: [permissions.VIEW_INTERNATIONAL_PANEL, permissions.VIEW_DONATIONS],
  administrador: Object.values(permissions),
};

export function can(roleId, permission) {
  return rolePermissions[roleId]?.includes(permission) || false;
}

export function getRole(roleId) {
  return roleCatalog.find((role) => role.id === roleId) || roleCatalog[0];
}

export function getAllowedRoles(permission) {
  return roleCatalog.filter((role) => can(role.id, permission));
}

export function maskSensitiveValue({ value, isMinor = false, permissionGranted = false, fallback = "Informacion protegida" }) {
  if (permissionGranted && !isMinor) return value;
  return fallback;
}
