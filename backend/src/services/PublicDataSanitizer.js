function maskPhone(phone) {
  if (!phone) return undefined;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${"*".repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
}

function zoneSummary(zone) {
  if (!zone) return undefined;
  return {
    id: zone.id,
    code: zone.code,
    state: zone.state,
    municipality: zone.municipality,
    parish: zone.parish,
    sector: zone.sector,
    level: zone.level,
    color: zone.color,
    operationalStatus: zone.operationalStatus,
    radiusKm: zone.radiusKm,
    verification: zone.verification,
    approximateLat: approximateCoordinate(zone.lat),
    approximateLng: approximateCoordinate(zone.lng),
  };
}

function approximateCoordinate(value) {
  if (value === undefined || value === null) return undefined;
  return Number(Number(value).toFixed(2));
}

export function sanitizePublicPlaceText(place, zone) {
  if (zone) {
    return [zone.sector, zone.municipality, zone.state].filter(Boolean).join(", ");
  }

  if (!place) return undefined;

  const text = String(place)
    .replace(/[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)[,\s]+[-+]?(1[0-7]\d(\.\d+)?|[1-9]?\d(\.\d+)?|180(\.0+)?)/g, "")
    .replace(/\+?\d[\d\s().-]{6,}\d/g, "")
    .replace(/\b(V|E|J|G)?-?\d{6,10}\b/gi, "")
    .replace(/\s*[·•]\s*(piso|apartamento|apto|casa|#|nro|numero|\d).*/i, "")
    .replace(/\b(calle|av\.?|avenida|carrera|vereda|edificio|torre|piso|apartamento|apto|casa|numero|nro|#)\b.*$/i, "")
    .replace(/\s*[·•]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || text.length < 3) return "Zona general protegida";

  const parts = text.split(/[,;-]/).map((part) => part.trim()).filter(Boolean);
  const general = parts.slice(-2).join(", ") || parts[0];

  if (/\d/.test(general) || general.length > 80) return "Zona general protegida";
  return general;
}

export class PublicDataSanitizer {
  static emergency(report) {
    return {
      id: report.id,
      code: report.code,
      type: report.type,
      priority: report.priority,
      status: report.status,
      peopleAffected: report.peopleAffected,
      publicLocation: sanitizePublicPlaceText(report.publicLocation, report.affectedZone),
      source: report.source,
      verificationStatus: report.verificationStatus,
      affectedZone: zoneSummary(report.affectedZone),
      createdAt: report.createdAt,
    };
  }

  static safeReport(report) {
    return {
      id: report.id,
      fullName: report.fullName,
      phone: maskPhone(report.phone),
      currentPlace: sanitizePublicPlaceText(report.currentPlace, report.affectedZone),
      verificationStatus: report.verificationStatus,
      affectedZone: zoneSummary(report.affectedZone),
      createdAt: report.createdAt,
    };
  }

  static missing(report) {
    const restricted = report.isMinor || report.privacyLevel === "restricted";
    return {
      id: report.id,
      fullName: restricted ? "Informacion protegida" : report.fullName,
      age: report.age,
      sex: report.sex,
      clothing: restricted ? undefined : report.clothing,
      lastSeenPlace: sanitizePublicPlaceText(report.lastSeenPlace, report.affectedZone),
      privacyLevel: restricted ? "restricted" : report.privacyLevel,
      verificationStatus: report.verificationStatus,
      affectedZone: zoneSummary(report.affectedZone),
      createdAt: report.createdAt,
    };
  }

  static rescued(person) {
    const restricted = person.isMinor;
    return {
      id: person.id,
      name: restricted ? "Informacion protegida" : person.name,
      approximateAge: person.approximateAge,
      sex: person.sex,
      conditionSummary: person.conditionSummary,
      status: person.status,
      privacyLevel: restricted ? "restricted" : "standard",
      affectedZone: zoneSummary(person.affectedZone),
      hospital: restricted ? undefined : person.hospital?.name,
      shelter: restricted ? undefined : person.shelter?.name,
      createdAt: person.createdAt,
    };
  }

  static hospital(hospital) {
    return {
      id: hospital.id,
      name: hospital.name,
      capacity: hospital.capacity,
      occupied: hospital.occupied,
      status: hospital.status,
      affectedZone: zoneSummary(hospital.affectedZone),
      updatedAt: hospital.updatedAt,
    };
  }

  static shelter(shelter) {
    return {
      id: shelter.id,
      name: shelter.name,
      capacity: shelter.capacity,
      occupied: shelter.occupied,
      status: shelter.status,
      affectedZone: zoneSummary(shelter.affectedZone),
      updatedAt: shelter.updatedAt,
    };
  }

  static organization(org) {
    return {
      id: org.id,
      name: org.name,
      country: org.country,
      city: org.city,
      categories: org.categories,
      status: org.status,
      createdAt: org.createdAt,
    };
  }

  static donation(donation) {
    return {
      id: donation.id,
      code: donation.code,
      amount: donation.amount,
      currency: donation.currency,
      status: donation.status,
      intendedUse: donation.intendedUse,
      publicDonor: donation.publicDonor,
      organization: donation.organization?.name,
      affectedZone: zoneSummary(donation.affectedZone),
      createdAt: donation.createdAt,
    };
  }

  static affectedZone(zone) {
    return {
      ...zoneSummary(zone),
      approximateLat: approximateCoordinate(zone.lat),
      approximateLng: approximateCoordinate(zone.lng),
    };
  }
}
