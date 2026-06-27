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

  assert.equal(listResponse.statusCode, 401);
  assert.equal(runResponse.statusCode, 401);
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
    publicSafe: {
      fullName: "Informacion protegida",
      recordType: "missing_person",
      privacyLevel: "restricted",
      zone: "Los Teques",
    },
    rawPayload: { telefono: "04121234567", documento: "V-12345678" },
  }];

  try {
    const response = await dispatch(createApp(), { url: "/api/missing/public" });
    assert.equal(response.statusCode, 200);
    const body = response._getJSONData();
    assert.equal(body.data[0].rawPayload, undefined);
    assert.equal(body.data[0].telefono, undefined);
    assert.equal(body.data[0].documento, undefined);
    assert.equal(body.data[0].fullName, "Informacion protegida");
  } finally {
    prisma.missingPersonReport.findMany = originalMissing;
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
