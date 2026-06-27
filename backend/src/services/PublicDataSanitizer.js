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
    sector: zone.sector,
    level: zone.level,
    radiusKm: zone.radiusKm,
    verification: zone.verification,
  };
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
      publicLocation: report.publicLocation,
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
      currentPlace: report.currentPlace,
      message: report.message,
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
      lastSeenPlace: restricted ? "Zona general protegida" : report.lastSeenPlace,
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
      code: person.code,
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
}
