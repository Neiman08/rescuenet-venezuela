import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import jwt from "jsonwebtoken";
import httpMocks from "node-mocks-http";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";

function dispatch(app, { method = "GET", url, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = httpMocks.createRequest({ method, url, body, headers });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    res.on("end", () => resolve(res));
    res.on("error", reject);
    app.handle(req, res);
  });
}

test("public emergency route responds without token", async () => {
  const originalFindMany = prisma.emergencyReport.findMany;
  prisma.emergencyReport.findMany = async () => [];

  try {
    const response = await dispatch(createApp(), { url: "/api/emergency/public" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response._getJSONData(), { data: [] });
  } finally {
    prisma.emergencyReport.findMany = originalFindMany;
  }
});

test("public affected zones route responds without token and sanitizes exact coordinates", async () => {
  const originalFindMany = prisma.affectedZone.findMany;
  prisma.affectedZone.findMany = async () => [{
    id: "zone-1",
    code: "VE-MIR-GUAICAIPURO-LOSTEQUES",
    state: "Miranda",
    municipality: "Guaicaipuro",
    parish: "Los Teques",
    sector: "Los Teques",
    level: "CRITICA",
    color: "#dc2626",
    operationalStatus: "RESPUESTA_ACTIVA",
    lat: "10.3447000",
    lng: "-67.0433000",
    radiusKm: 8,
    verification: "VERIFICADA",
  }];

  try {
    const response = await dispatch(createApp(), { url: "/api/affected-zones/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.data[0].lat, undefined);
    assert.equal(body.data[0].lng, undefined);
    assert.equal(body.data[0].approximateLat, 10.34);
    assert.equal(body.data[0].approximateLng, -67.04);
  } finally {
    prisma.affectedZone.findMany = originalFindMany;
  }
});

test("public emergency submission rejects unknown affected zones without token", async () => {
  const originalFindFirst = prisma.affectedZone.findFirst;
  prisma.affectedZone.findFirst = async () => null;

  try {
    const response = await dispatch(createApp(), {
      method: "POST",
      url: "/api/emergency",
      body: {
        affectedZoneId: "az-001",
        type: "Derrumbe",
        description: "Personas necesitan ayuda urgente",
        peopleAffected: 2,
        publicLocation: "Los Teques",
      },
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response._getJSONData().error.code, "INVALID_AFFECTED_ZONE");
  } finally {
    prisma.affectedZone.findFirst = originalFindFirst;
  }
});

test("public help center submission creates pending record without exposing private fields", async () => {
  const originalCreate = prisma.importedHumanitarianRecord.create;
  const originalAuditCreate = prisma.auditLog.create;
  prisma.importedHumanitarianRecord.create = async ({ data }) => ({
    id: "center-public-1",
    recordType: data.recordType,
    publicSafe: data.publicSafe,
  });
  prisma.auditLog.create = async () => ({ id: "audit-1" });

  try {
    const response = await dispatch(createApp(), {
      method: "POST",
      url: "/api/help-centers",
      body: {
        recordType: "collection_center",
        name: "Centro de Acopio Comunitario",
        publicLocation: "Los Teques",
        addressPrivate: "Calle exacta casa 12",
        contactPrivate: "04121234567",
        acceptedItems: ["agua", "alimentos"],
      },
    });
    assert.equal(response.statusCode, 201);
    const body = response._getJSONData();
    assert.equal(body.data.status, "pending_review");
    assert.equal(JSON.stringify(body).includes("0412"), false);
    assert.equal(JSON.stringify(body).includes("Calle exacta"), false);
  } finally {
    prisma.importedHumanitarianRecord.create = originalCreate;
    prisma.auditLog.create = originalAuditCreate;
  }
});

test("public logistics submission creates pending record without exposing contact", async () => {
  const originalCreate = prisma.importedHumanitarianRecord.create;
  const originalAuditCreate = prisma.auditLog.create;
  prisma.importedHumanitarianRecord.create = async ({ data }) => ({
    id: "log-public-1",
    recordType: data.recordType,
    publicSafe: data.publicSafe,
  });
  prisma.auditLog.create = async () => ({ id: "audit-1" });

  try {
    const response = await dispatch(createApp(), {
      method: "POST",
      url: "/api/logistics/public",
      body: {
        itemType: "water",
        requester: "Comunidad Los Teques",
        publicLocation: "Los Teques",
        quantity: "500 litros",
        contactPrivate: "contacto interno 04121234567",
      },
    });
    assert.equal(response.statusCode, 201);
    const body = response._getJSONData();
    assert.equal(body.data.status, "pending_review");
    assert.equal(JSON.stringify(body).includes("0412"), false);
    assert.equal(body.data.publicSafe.itemType, "water");
  } finally {
    prisma.importedHumanitarianRecord.create = originalCreate;
    prisma.auditLog.create = originalAuditCreate;
  }
});

test("public rescued report creates unverified imported record without exposing private fields", async () => {
  const originalCreate = prisma.importedHumanitarianRecord.create;
  const originalAuditCreate = prisma.auditLog.create;
  let createdData;
  prisma.importedHumanitarianRecord.create = async ({ data }) => {
    createdData = data;
    return {
      id: "rescued-public-1",
      publicSafe: data.publicSafe,
    };
  };
  prisma.auditLog.create = async () => ({ id: "audit-1" });

  try {
    const response = await dispatch(createApp(), {
      method: "POST",
      url: "/api/rescued/report",
      body: {
        name: "Persona Rescatada",
        approximateAge: "40",
        sex: "Femenino",
        state: "Miranda",
        municipality: "Guaicaipuro",
        publicLocation: "Los Teques",
        currentPlace: "Refugio exacto privado",
        conditionSummary: "Diagnostico privado",
        observations: "Observacion sensible",
        reporterName: "Reportante",
        contactPrivate: "0412-1234567",
        source: "Brigada local",
      },
    });
    assert.equal(response.statusCode, 201);
    assert.equal(createdData.recordType, "rescued_person");
    assert.equal(createdData.verificationStatus, "NO_VERIFICADO");
    assert.equal(createdData.contactPrivate, "0412-1234567");
    assert.equal(createdData.medicalPrivate.conditionSummary, "Diagnostico privado");
    const body = response._getJSONData();
    assert.equal(body.data.status, "pending_review");
    assert.equal(JSON.stringify(body).includes("0412"), false);
    assert.equal(JSON.stringify(body).includes("Diagnostico privado"), false);
    assert.equal(JSON.stringify(body).includes("Observacion sensible"), false);
    assert.equal(JSON.stringify(body).includes("rawPayload"), false);
  } finally {
    prisma.importedHumanitarianRecord.create = originalCreate;
    prisma.auditLog.create = originalAuditCreate;
  }
});

test("protected emergency route rejects requests without token", async () => {
  const response = await dispatch(createApp(), { url: "/api/emergency" });
  assert.equal(response.statusCode, 401);
});

test("raw donation route rejects anonymous requests", async () => {
  const response = await dispatch(createApp(), { url: "/api/donations" });
  assert.equal(response.statusCode, 401);
});

test("protected admin route rejects requests without token", async () => {
  const response = await dispatch(createApp(), { url: "/api/admin/status" });
  assert.equal(response.statusCode, 401);
});

test("protected ingestion routes reject requests without token", async () => {
  const listResponse = await dispatch(createApp(), { url: "/api/ingestion/records" });
  const runResponse = await dispatch(createApp(), { method: "POST", url: "/api/ingestion/run" });
  const runProductionResponse = await dispatch(createApp(), { method: "POST", url: "/api/ingestion/run-production" });
  const manualUploadResponse = await dispatch(createApp(), { method: "POST", url: "/api/ingestion/manual-upload", body: { records: [] } });
  const approveManyResponse = await dispatch(createApp(), { method: "POST", url: "/api/ingestion/records/approve-many", body: { ids: ["record-1"] } });
  const approveFilteredResponse = await dispatch(createApp(), { method: "POST", url: "/api/ingestion/records/approve-filtered", body: { filters: { recordType: "hospital" } } });

  assert.equal(listResponse.statusCode, 401);
  assert.equal(runResponse.statusCode, 401);
  assert.equal(runProductionResponse.statusCode, 401);
  assert.equal(manualUploadResponse.statusCode, 401);
  assert.equal(approveManyResponse.statusCode, 401);
  assert.equal(approveFilteredResponse.statusCode, 401);
});

test("protected ingestion routes require ingestion permission", async () => {
  const originalFindFirst = prisma.user.findFirst;
  prisma.user.findFirst = async () => ({
    id: "user-public",
    email: "public@example.org",
    roles: [{ role: { name: "PUBLICO" } }],
  });

  try {
    const token = jwt.sign({ sub: "user-public" }, env.JWT_ACCESS_SECRET);
    const response = await dispatch(createApp(), { url: "/api/ingestion/records", headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.statusCode, 403);
  } finally {
    prisma.user.findFirst = originalFindFirst;
  }
});

test("public missing endpoint merges approved publicSafe records without rawPayload", async () => {
  const originalMissing = prisma.missingPersonReport.findMany;
  const originalImported = prisma.importedHumanitarianRecord.findMany;
  prisma.missingPersonReport.findMany = async () => [];
  prisma.importedHumanitarianRecord.findMany = async () => [{
    id: "imported-1",
    state: "Miranda",
    municipality: "Guaicaipuro",
    zone: "Los Teques",
    latitudePrivate: 10.345,
    longitudePrivate: -67.041,
    publicSafe: {
      fullName: "Informacion protegida",
      recordType: "missing_person",
      privacyLevel: "restricted",
      state: "Miranda",
      municipality: "Guaicaipuro",
      zone: "Los Teques",
    },
    rawPayload: { telefono: "04121234567", documento: "V-12345678" },
  }];

  try {
    const response = await dispatch(createApp(), { url: "/api/missing/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.data[0].rawPayload, undefined);
    assert.equal(body.data[0].latitudePrivate, undefined);
    assert.equal(body.data[0].longitudePrivate, undefined);
    assert.equal(body.data[0].telefono, undefined);
    assert.equal(body.data[0].documento, undefined);
    assert.equal(body.data[0].fullName, "Informacion protegida");
  } finally {
    prisma.missingPersonReport.findMany = originalMissing;
    prisma.importedHumanitarianRecord.findMany = originalImported;
  }
});

test("public missing endpoint does not request hospitalized imported records", async () => {
  const originalMissing = prisma.missingPersonReport.findMany;
  const originalImported = prisma.importedHumanitarianRecord.findMany;
  let requestedTypes = [];
  prisma.missingPersonReport.findMany = async () => [];
  prisma.importedHumanitarianRecord.findMany = async ({ where }) => {
    requestedTypes = where.recordType.in;
    return [];
  };

  try {
    const response = await dispatch(createApp(), { url: "/api/missing/public" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(requestedTypes, ["missing_person"]);
  } finally {
    prisma.missingPersonReport.findMany = originalMissing;
    prisma.importedHumanitarianRecord.findMany = originalImported;
  }
});

test("public rescued endpoint does not expose internal person codes", async () => {
  const originalRescued = prisma.rescuedPerson.findMany;
  const originalImported = prisma.importedHumanitarianRecord.findMany;
  prisma.rescuedPerson.findMany = async () => [{
    id: "rescued-1",
    code: "RSC-VERY-LONG-INTERNAL-CODE",
    name: "Persona Rescatada",
    approximateAge: "30",
    sex: "No indicado",
    status: "Rescatado",
    affectedZone: null,
    hospital: null,
    shelter: null,
    createdAt: new Date(),
  }];
  prisma.importedHumanitarianRecord.findMany = async () => [];

  try {
    const response = await dispatch(createApp(), { url: "/api/rescued/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.data[0].code, undefined);
    assert.equal(JSON.stringify(body).includes("RSC-VERY-LONG-INTERNAL-CODE"), false);
  } finally {
    prisma.rescuedPerson.findMany = originalRescued;
    prisma.importedHumanitarianRecord.findMany = originalImported;
  }
});

test("public help centers endpoint exposes approved publicSafe centers only", async () => {
  const originalHospital = prisma.hospital.findMany;
  const originalShelter = prisma.shelter.findMany;
  const originalImported = prisma.importedHumanitarianRecord.findMany;
  prisma.hospital.findMany = async () => [];
  prisma.shelter.findMany = async () => [];
  prisma.importedHumanitarianRecord.findMany = async () => [{
    id: "center-1",
    publicSafe: {
      recordType: "collection_center",
      name: "Centro de Acopio Los Teques",
      organization: "ONG Local",
      state: "Miranda",
      municipality: "Guaicaipuro",
      publicLocation: "Los Teques, Guaicaipuro, Miranda",
      acceptedItems: ["agua", "alimentos"],
      operationalStatus: "ACTIVO",
    },
    rawPayload: { telefono: "04121234567", direccion: "Calle 12 casa 4" },
  }];

  try {
    const response = await dispatch(createApp(), { url: "/api/help-centers/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.imported[0].rawPayload, undefined);
    assert.equal(JSON.stringify(body.imported[0]).includes("0412"), false);
    assert.equal(JSON.stringify(body.imported[0]).includes("Calle 12"), false);
    assert.equal(body.imported[0].name, "Centro de Acopio Los Teques");
  } finally {
    prisma.hospital.findMany = originalHospital;
    prisma.shelter.findMany = originalShelter;
    prisma.importedHumanitarianRecord.findMany = originalImported;
  }
});

test("public hospitals endpoint hides hospitals outside affected operational zones", async () => {
  const originalHospital = prisma.hospital.findMany;
  const originalImported = prisma.importedHumanitarianRecord.findMany;
  prisma.hospital.findMany = async () => [
    {
      id: "hospital-lag-1",
      name: "Hospital Vargas",
      capacity: 100,
      occupied: 0,
      status: "OPERATIVO",
      affectedZone: { state: "La Guaira", municipality: "Vargas", sector: "Maiquetia", lat: 10.6, lng: -66.96 },
      updatedAt: new Date(),
    },
    {
      id: "hospital-out-1",
      name: "Hospital Amazonas",
      capacity: 100,
      occupied: 0,
      status: "OPERATIVO",
      affectedZone: { state: "Amazonas", municipality: "Atures", sector: "Puerto Ayacucho", lat: 5.66, lng: -67.63 },
      updatedAt: new Date(),
    },
  ];
  prisma.importedHumanitarianRecord.findMany = async () => [];

  try {
    const response = await dispatch(createApp(), { url: "/api/hospitals/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].name, "Hospital Vargas");
    assert.equal(body.data[0].operationalType, "hospital_near_disaster");
  } finally {
    prisma.hospital.findMany = originalHospital;
    prisma.importedHumanitarianRecord.findMany = originalImported;
  }
});

test("public help centers endpoint includes collection centers in critical affected zones", async () => {
  const originalHospital = prisma.hospital.findMany;
  const originalShelter = prisma.shelter.findMany;
  const originalImported = prisma.importedHumanitarianRecord.findMany;
  prisma.hospital.findMany = async () => [];
  prisma.shelter.findMany = async () => [];
  prisma.importedHumanitarianRecord.findMany = async () => [{
    id: "center-critical-1",
    recordType: "collection_center",
    state: "Miranda",
    municipality: "Guaicaipuro",
    publicSafe: {
      recordType: "collection_center",
      name: "Centro de Acopio Los Teques",
      state: "Miranda",
      municipality: "Guaicaipuro",
      publicLocation: "Los Teques, Guaicaipuro, Miranda",
      acceptedItems: ["agua"],
    },
  }];

  try {
    const response = await dispatch(createApp(), { url: "/api/help-centers/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.imported.length, 1);
    assert.equal(body.imported[0].operationalType, "collection_center");
    assert.equal(body.imported[0].operationalPriority, "CRITICA");
  } finally {
    prisma.hospital.findMany = originalHospital;
    prisma.shelter.findMany = originalShelter;
    prisma.importedHumanitarianRecord.findMany = originalImported;
  }
});

test("public map endpoint does not return resources outside affected operational zones", async () => {
  const originals = {
    zones: prisma.affectedZone.findMany,
    reports: prisma.emergencyReport.findMany,
    shelters: prisma.shelter.findMany,
    hospitals: prisma.hospital.findMany,
    imported: prisma.importedHumanitarianRecord.findMany,
  };
  prisma.affectedZone.findMany = async () => [];
  prisma.emergencyReport.findMany = async () => [];
  prisma.shelter.findMany = async () => [];
  prisma.hospital.findMany = async () => [
    { id: "h-in", name: "Hospital La Guaira", status: "OPERATIVO", affectedZone: { state: "La Guaira", municipality: "Vargas", sector: "Macuto", lat: 10.61, lng: -66.89 }, updatedAt: new Date() },
    { id: "h-out", name: "Hospital Apure", status: "OPERATIVO", affectedZone: { state: "Apure", municipality: "San Fernando", sector: "San Fernando", lat: 7.89, lng: -67.47 }, updatedAt: new Date() },
  ];
  prisma.importedHumanitarianRecord.findMany = async () => [];

  try {
    const response = await dispatch(createApp(), { url: "/api/map/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.hospitals.length, 1);
    assert.equal(body.hospitals[0].name, "Hospital La Guaira");
    assert.equal(body.hospitals.some((item) => item.name === "Hospital Apure"), false);
  } finally {
    prisma.affectedZone.findMany = originals.zones;
    prisma.emergencyReport.findMany = originals.reports;
    prisma.shelter.findMany = originals.shelters;
    prisma.hospital.findMany = originals.hospitals;
    prisma.importedHumanitarianRecord.findMany = originals.imported;
  }
});

test("production compatibility aliases expose persons, map and centers without token", async () => {
  const originals = {
    zones: prisma.affectedZone.findMany,
    reports: prisma.emergencyReport.findMany,
    shelters: prisma.shelter.findMany,
    hospitals: prisma.hospital.findMany,
    missing: prisma.missingPersonReport.findMany,
    safe: prisma.safeReport.findMany,
    rescued: prisma.rescuedPerson.findMany,
    admissions: prisma.hospitalAdmission.findMany,
    imported: prisma.importedHumanitarianRecord.findMany,
  };
  prisma.affectedZone.findMany = async () => [];
  prisma.emergencyReport.findMany = async () => [];
  prisma.shelter.findMany = async () => [];
  prisma.hospital.findMany = async () => [];
  prisma.missingPersonReport.findMany = async () => [];
  prisma.safeReport.findMany = async () => [];
  prisma.rescuedPerson.findMany = async () => [];
  prisma.hospitalAdmission.findMany = async () => [];
  prisma.importedHumanitarianRecord.findMany = async () => [];

  try {
    const persons = await dispatch(createApp(), { url: "/api/persons" });
    const map = await dispatch(createApp(), { url: "/api/map" });
    const centers = await dispatch(createApp(), { url: "/api/centers" });

    assert.equal(persons.statusCode, 200);
    assert.equal(map.statusCode, 200);
    assert.equal(centers.statusCode, 200);
    assert.deepEqual(persons._getJSONData(), { data: [], meta: { total: 0 } });
    assert.equal(Array.isArray(map._getJSONData().zones), true);
    assert.equal(Array.isArray(centers._getJSONData().hospitals), true);
  } finally {
    prisma.affectedZone.findMany = originals.zones;
    prisma.emergencyReport.findMany = originals.reports;
    prisma.shelter.findMany = originals.shelters;
    prisma.hospital.findMany = originals.hospitals;
    prisma.missingPersonReport.findMany = originals.missing;
    prisma.safeReport.findMany = originals.safe;
    prisma.rescuedPerson.findMany = originals.rescued;
    prisma.hospitalAdmission.findMany = originals.admissions;
    prisma.importedHumanitarianRecord.findMany = originals.imported;
  }
});

test("public dashboard counts only affected operational resources", async () => {
  const originals = {
    overview: prisma.emergencyReport.findMany,
    activeEmergencyCount: prisma.emergencyReport.count,
    hospitalCount: prisma.hospital.count,
    shelterCount: prisma.shelter.count,
    organizationCount: prisma.organization.count,
    donationAggregate: prisma.donation.aggregate,
    hospitalFindMany: prisma.hospital.findMany,
    shelterFindMany: prisma.shelter.findMany,
    missingCount: prisma.missingPersonReport.count,
    safeCount: prisma.safeReport.count,
    rescuedCount: prisma.rescuedPerson.count,
    admissionsCount: prisma.hospitalAdmission.count,
    importedCount: prisma.importedHumanitarianRecord.count,
    importedFindMany: prisma.importedHumanitarianRecord.findMany,
  };
  prisma.emergencyReport.findMany = async () => [];
  prisma.emergencyReport.count = async () => 0;
  prisma.hospital.count = async () => 2;
  prisma.shelter.count = async () => 0;
  prisma.organization.count = async () => 0;
  prisma.donation.aggregate = async () => ({ _sum: { amount: 0 } });
  prisma.hospital.findMany = async () => [
    { id: "h-in", name: "Hospital La Guaira", affectedZone: { state: "La Guaira", municipality: "Vargas", sector: "Macuto", lat: 10.61, lng: -66.89 } },
    { id: "h-out", name: "Hospital Apure", affectedZone: { state: "Apure", municipality: "San Fernando", sector: "San Fernando", lat: 7.89, lng: -67.47 } },
  ];
  prisma.shelter.findMany = async () => [];
  prisma.missingPersonReport.count = async () => 1;
  prisma.safeReport.count = async () => 0;
  prisma.rescuedPerson.count = async () => 0;
  prisma.hospitalAdmission.count = async () => 0;
  prisma.importedHumanitarianRecord.count = async ({ where }) => {
    if (where.recordType === "missing_person") return 2;
    if (where.recordType === "trapped_person") return 3;
    return 0;
  };
  prisma.importedHumanitarianRecord.findMany = async () => [];

  try {
    const response = await dispatch(createApp(), { url: "/api/dashboard/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.stats.nearbyHospitals, 1);
    assert.equal(body.stats.activeCenters, 1);
    assert.equal(body.stats.missingPeople, 3);
    assert.equal(body.stats.trappedPeople, 3);
  } finally {
    prisma.emergencyReport.findMany = originals.overview;
    prisma.emergencyReport.count = originals.activeEmergencyCount;
    prisma.hospital.count = originals.hospitalCount;
    prisma.shelter.count = originals.shelterCount;
    prisma.organization.count = originals.organizationCount;
    prisma.donation.aggregate = originals.donationAggregate;
    prisma.hospital.findMany = originals.hospitalFindMany;
    prisma.shelter.findMany = originals.shelterFindMany;
    prisma.missingPersonReport.count = originals.missingCount;
    prisma.safeReport.count = originals.safeCount;
    prisma.rescuedPerson.count = originals.rescuedCount;
    prisma.hospitalAdmission.count = originals.admissionsCount;
    prisma.importedHumanitarianRecord.count = originals.importedCount;
    prisma.importedHumanitarianRecord.findMany = originals.importedFindMany;
  }
});

test("public family search consolidates safe public data without raw payload", async () => {
  const originals = {
    missing: prisma.missingPersonReport.findMany,
    safe: prisma.safeReport.findMany,
    rescued: prisma.rescuedPerson.findMany,
    admissions: prisma.hospitalAdmission.findMany,
    imported: prisma.importedHumanitarianRecord.findMany,
  };
  prisma.missingPersonReport.findMany = async () => [];
  prisma.safeReport.findMany = async () => [];
  prisma.rescuedPerson.findMany = async () => [];
  prisma.hospitalAdmission.findMany = async () => [];
  prisma.importedHumanitarianRecord.findMany = async () => [{
    id: "imported-person-1",
    recordType: "missing_person",
    fullName: "Nombre interno",
    approximateAge: "12",
    status: "desaparecida",
    zone: "Los Teques",
    privacyLevel: "restricted",
    verificationStatus: "APROBADO",
    publicSafe: {
      fullName: "Informacion protegida",
      approximateAge: "Menor de edad",
      status: "desaparecida",
      zone: "Los Teques",
    },
    rawPayload: { telefono: "04121234567", documento: "V-12345678" },
    updatedAt: new Date(),
  }];

  try {
    const response = await dispatch(createApp(), { url: "/api/family-search/public?q=Los%20Teques" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.data[0].name, "Informacion protegida");
    assert.equal(body.data[0].code, undefined);
    assert.equal(body.data[0].rawPayload, undefined);
    assert.equal(JSON.stringify(body).includes("0412"), false);
    assert.equal(JSON.stringify(body).includes("V-12345678"), false);
  } finally {
    prisma.missingPersonReport.findMany = originals.missing;
    prisma.safeReport.findMany = originals.safe;
    prisma.rescuedPerson.findMany = originals.rescued;
    prisma.hospitalAdmission.findMany = originals.admissions;
    prisma.importedHumanitarianRecord.findMany = originals.imported;
  }
});

test("public family search can match cedula privately without exposing sensitive fields", async () => {
  const originals = {
    missing: prisma.missingPersonReport.findMany,
    safe: prisma.safeReport.findMany,
    rescued: prisma.rescuedPerson.findMany,
    admissions: prisma.hospitalAdmission.findMany,
    imported: prisma.importedHumanitarianRecord.findMany,
  };
  prisma.missingPersonReport.findMany = async () => { throw new Error("document search should not scan public missing reports"); };
  prisma.safeReport.findMany = async () => { throw new Error("document search should not scan safe reports"); };
  prisma.rescuedPerson.findMany = async () => { throw new Error("document search should not scan rescued reports"); };
  prisma.hospitalAdmission.findMany = async () => { throw new Error("document search should not scan admissions"); };
  prisma.importedHumanitarianRecord.findMany = async () => [{
    id: "imported-doc-1",
    recordType: "missing_person",
    fullName: "Nombre interno",
    documentPrivate: { cedula: "V-12345678" },
    contactInfoPrivate: "0412-1234567",
    rawPayload: { cedula: "V-12345678", telefono: "0412-1234567" },
    privacyLevel: "standard",
    verificationStatus: "APROBADO",
    publicSafe: {
      fullName: "Persona Publica",
      approximateAge: "30",
      status: "desaparecida",
      zone: "Los Teques",
    },
    updatedAt: new Date(),
  }];

  try {
    const response = await dispatch(createApp(), { url: "/api/family-search/public?cedula=12345678" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].name, "Persona Publica");
    assert.equal(body.data[0].code, undefined);
    assert.equal(JSON.stringify(body).includes("12345678"), false);
    assert.equal(JSON.stringify(body).includes("0412"), false);
    assert.equal(JSON.stringify(body).includes("rawPayload"), false);
  } finally {
    prisma.missingPersonReport.findMany = originals.missing;
    prisma.safeReport.findMany = originals.safe;
    prisma.rescuedPerson.findMany = originals.rescued;
    prisma.hospitalAdmission.findMany = originals.admissions;
    prisma.importedHumanitarianRecord.findMany = originals.imported;
  }
});

test("public hospitalized endpoint returns publicSafe without private hospital details", async () => {
  const originals = {
    admissions: prisma.hospitalAdmission.findMany,
    imported: prisma.importedHumanitarianRecord.findMany,
  };
  prisma.hospitalAdmission.findMany = async () => [];
  prisma.importedHumanitarianRecord.findMany = async () => [{
    id: "hospitalized-1",
    recordType: "hospitalized_person",
    fullName: "Nombre interno",
    documentPrivate: { cedula: "V-12345678" },
    medicalPrivate: { condition: "Diagnostico sensible" },
    locationPrivate: { room: "402", bed: "B" },
    rawPayload: { cedula: "V-12345678", telefono: "0412-1234567", room: "402" },
    state: "POLITRAUMATISMO57",
    status: "POLITRAUMATISMO57",
    bed: "Cama 12",
    room: "Habitacion 402",
    privacyLevel: "standard",
    verificationStatus: "APROBADO",
    publicSafe: {
      fullName: "Persona Hospitalizada",
      approximateAge: "30",
      status: "POLITRAUMATISMO57",
      hospitalName: "Hospital Publico",
      zone: "Caracas",
      recordType: "hospitalized_person",
    },
    updatedAt: new Date(),
  }];

  try {
    const response = await dispatch(createApp(), { url: "/api/hospitalized/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].fullName, "Persona Hospitalizada");
    assert.equal(body.data[0].status, "Hospitalizado");
    assert.equal(body.data[0].state, undefined);
    assert.equal(JSON.stringify(body).includes("12345678"), false);
    assert.equal(JSON.stringify(body).includes("Diagnostico sensible"), false);
    assert.equal(JSON.stringify(body).includes("POLITRAUMATISMO"), false);
    assert.equal(JSON.stringify(body).includes("Cama"), false);
    assert.equal(JSON.stringify(body).includes("Habitacion"), false);
    assert.equal(JSON.stringify(body).includes("402"), false);
    assert.equal(JSON.stringify(body).includes("rawPayload"), false);
  } finally {
    prisma.hospitalAdmission.findMany = originals.admissions;
    prisma.importedHumanitarianRecord.findMany = originals.imported;
  }
});

test("public hospitalized endpoint filters imported header rows", async () => {
  const originals = {
    admissions: prisma.hospitalAdmission.findMany,
    imported: prisma.importedHumanitarianRecord.findMany,
  };
  prisma.hospitalAdmission.findMany = async () => [];
  prisma.importedHumanitarianRecord.findMany = async () => [
    {
      id: "header-1",
      recordType: "hospitalized_person",
      fullName: "Nombre",
      zone: "Apellido / Segundo Nombre",
      verificationStatus: "APROBADO",
      publicSafe: { fullName: "Nombre", status: "Hospitalizado", zone: "Apellido / Segundo Nombre" },
    },
    {
      id: "header-2",
      recordType: "hospitalized_person",
      fullName: "Edad Actualizada",
      verificationStatus: "APROBADO",
      publicSafe: { fullName: "Edad Actualizada", status: "Hospitalizado", zone: "Edad" },
    },
    {
      id: "valid-1",
      recordType: "hospitalized_person",
      fullName: "Rafael Gonzalez",
      verificationStatus: "APROBADO",
      publicSafe: { fullName: "Rafael Gonzalez", status: "Hospitalizado", zone: "Libertador Distrito Capital" },
    },
  ];

  try {
    const response = await dispatch(createApp(), { url: "/api/hospitalized/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].fullName, "Rafael Gonzalez");
    assert.equal(JSON.stringify(body).includes("Apellido / Segundo Nombre"), false);
    assert.equal(JSON.stringify(body).includes("Edad Actualizada"), false);
  } finally {
    prisma.hospitalAdmission.findMany = originals.admissions;
    prisma.importedHumanitarianRecord.findMany = originals.imported;
  }
});

test("public rescued endpoint returns empty data when db has no records — no demo data", async () => {
  const originalRescued = prisma.rescuedPerson.findMany;
  const originalImported = prisma.importedHumanitarianRecord.findMany;
  prisma.rescuedPerson.findMany = async () => [];
  prisma.importedHumanitarianRecord.findMany = async () => [];

  try {
    const response = await dispatch(createApp(), { url: "/api/rescued/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.data.length, 0);
    assert.equal(JSON.stringify(body).includes("No identificado"), false);
    assert.equal(JSON.stringify(body).includes("Maria Gonzalez"), false);
    assert.equal(JSON.stringify(body).includes("Hombre no identificado"), false);
  } finally {
    prisma.rescuedPerson.findMany = originalRescued;
    prisma.importedHumanitarianRecord.findMany = originalImported;
  }
});

test("public hospitalized endpoint repairs legacy google drive split surnames", async () => {
  const originals = {
    admissions: prisma.hospitalAdmission.findMany,
    imported: prisma.importedHumanitarianRecord.findMany,
  };
  prisma.hospitalAdmission.findMany = async () => [];
  prisma.importedHumanitarianRecord.findMany = async () => [
    {
      id: "legacy-1",
      sourceName: "SISMO 2026 VZLA - Google Drive Hospitales",
      recordType: "hospitalized_person",
      fullName: "José",
      zone: "Ramírez",
      verificationStatus: "APROBADO",
      publicSafe: {
        fullName: "José",
        status: "Hospitalizado",
        zone: "Ramírez",
        sourceName: "SISMO 2026 VZLA - Google Drive Hospitales",
      },
    },
  ];

  try {
    const response = await dispatch(createApp(), { url: "/api/hospitalized/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].fullName, "José Ramírez");
    assert.equal(body.data[0].zone, "Zona general protegida");
  } finally {
    prisma.hospitalAdmission.findMany = originals.admissions;
    prisma.importedHumanitarianRecord.findMany = originals.imported;
  }
});
