import test from "node:test";
import assert from "node:assert/strict";

import {
  mapRecord,
  mapRecordType,
  detectSensitiveFields,
  runRedayudaImport,
  BLOCKED_AUTO_PUBLISH,
  PERSON_TYPES,
  CENTER_TYPES,
  SOURCE_NAME,
} from "../src/integrations/redayudaImporter.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeRecord = (overrides = {}) => ({
  id: "hospitales_venezuela:abc123",
  record_type: "persona_hospitalizada",
  title: "María Pérez",
  summary: "Hospital en Caracas",
  person_name: "María Pérez",
  cedula: "12345678",
  age: 35,
  organization: "Hospital Universitario de Caracas",
  location_name: "Hospital Universitario de Caracas",
  city: "Caracas",
  state: "Miranda",
  country: "VE",
  latitude: 10.48801,
  longitude: -66.87919,
  contact: "04141234567",
  status: "registrada_en_centro_salud",
  verified: true,
  source_id: "hospitales_venezuela",
  source_name: "Hospitales en Venezuela",
  source_url: "https://hospitalesenvenezuela.com",
  source_record_id: "abc123",
  observed_at: "2026-06-27T03:00:00Z",
  updated_at: "2026-06-27T03:00:00Z",
  tags: ["persona", "hospital", "localizada"],
  raw: { cedula: "12345678", contacto: "04141234567" },
  image_url: null,
  ...overrides,
});

const makeDesaparecido = (overrides = {}) => makeRecord({
  id: "encuentralos:999",
  record_type: "persona_desaparecida",
  title: "Juan García",
  person_name: "Juan García",
  cedula: "9876543",
  contact: "04169999999",
  status: "buscando",
  organization: null,
  tags: ["persona", "desaparecida"],
  ...overrides,
});

const makeFallecido = (overrides = {}) => makeRecord({
  id: "fuente:x1",
  record_type: "fallecido",
  title: "Persona fallecida",
  person_name: "Persona fallecida",
  tags: [],
  ...overrides,
});

const makeCentroAcopio = (overrides = {}) => ({
  id: "refugios_vzla:c1",
  record_type: "centro_acopio",
  title: "Centro de Acopio Petare",
  summary: "Necesitan agua y comida",
  person_name: null,
  cedula: null,
  age: null,
  organization: "Centro de Acopio Petare",
  location_name: "Petare, Miranda",
  city: "Caracas",
  state: "Miranda",
  country: "VE",
  latitude: 10.5,
  longitude: -66.8,
  contact: null,
  status: "activo",
  verified: true,
  source_id: "refugios_vzla",
  source_name: "Refugios Venezuela",
  source_url: "https://refugiosvzla.duckdns.org",
  source_record_id: "c1",
  tags: ["centro_acopio", "logistica"],
  raw: {},
  image_url: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// 1. Mapeo de tipos
// ---------------------------------------------------------------------------

test("mapRecordType convierte tipos de Redayuda correctamente", () => {
  assert.equal(mapRecordType("persona_desaparecida"), "missing_person");
  assert.equal(mapRecordType("persona_hospitalizada"), "hospitalized_person");
  assert.equal(mapRecordType("persona_localizada"), "safe_person");
  assert.equal(mapRecordType("persona_a_salvo"), "safe_person");
  assert.equal(mapRecordType("fallecido"), "deceased_person_private_only");
  assert.equal(mapRecordType("centro_acopio"), "collection_center");
  assert.equal(mapRecordType("centro_donacion"), "collection_center");
  assert.equal(mapRecordType("recurso"), "help_center");
  assert.equal(mapRecordType("otro"), "help_center");
  assert.equal(mapRecordType("tipo_desconocido"), "help_center");
});

// ---------------------------------------------------------------------------
// 2. Detección de campos sensibles
// ---------------------------------------------------------------------------

test("detectSensitiveFields detecta cedula, contacto y coordenadas", () => {
  const record = makeRecord();
  const fields = detectSensitiveFields(record);
  assert.ok(fields.includes("cedula"), "debe detectar cedula");
  assert.ok(fields.includes("contact"), "debe detectar contact");
  assert.ok(fields.includes("coordinates"), "debe detectar coordenadas");
  assert.ok(fields.includes("raw"), "debe detectar raw");
});

test("detectSensitiveFields devuelve array vacío cuando no hay datos sensibles", () => {
  const record = makeRecord({
    cedula: null,
    contact: null,
    latitude: null,
    longitude: null,
    raw: {},
    source_url: null,
  });
  const fields = detectSensitiveFields(record);
  assert.deepEqual(fields, []);
});

// ---------------------------------------------------------------------------
// 3. Privacidad — publicSafe no expone datos sensibles
// ---------------------------------------------------------------------------

test("mapRecord no expone cedula en publicSafe", () => {
  const mapped = mapRecord(makeRecord());
  assert.equal(mapped.publicSafe.cedula, undefined, "cedula NO debe estar en publicSafe");
  assert.equal(mapped.publicSafe.documento, undefined);
  assert.equal(mapped.publicSafe.documentPrivate, undefined);
});

test("mapRecord no expone telefono/contacto en publicSafe", () => {
  const mapped = mapRecord(makeRecord());
  assert.equal(mapped.publicSafe.contact, undefined, "contact NO debe estar en publicSafe");
  assert.equal(mapped.publicSafe.telefono, undefined);
  assert.equal(mapped.publicSafe.contacto, undefined);
});

test("mapRecord no expone coordenadas precisas en publicSafe", () => {
  const mapped = mapRecord(makeRecord());
  assert.equal(mapped.publicSafe.latitude, undefined);
  assert.equal(mapped.publicSafe.longitude, undefined);
  assert.equal(mapped.publicSafe.lat, undefined);
  assert.equal(mapped.publicSafe.lng, undefined);
});

test("mapRecord no expone rawPayload en publicSafe", () => {
  const mapped = mapRecord(makeRecord());
  assert.equal(mapped.publicSafe.rawPayload, undefined);
  assert.equal(mapped.publicSafe.raw, undefined);
});

test("mapRecord no expone sourceUrl ni sourceRecordId en publicSafe", () => {
  const mapped = mapRecord(makeRecord());
  assert.equal(mapped.publicSafe.sourceUrl, undefined);
  assert.equal(mapped.publicSafe.sourceRecordId, undefined);
});

test("mapRecord almacena cedula en documentPrivate (nunca expuesta)", () => {
  const mapped = mapRecord(makeRecord({ cedula: "12345678" }));
  assert.ok(mapped.documentPrivate, "documentPrivate debe existir");
  assert.equal(mapped.documentPrivate.cedula, "12345678");
});

test("mapRecord almacena telefono en contactPrivate (nunca expuesto)", () => {
  const mapped = mapRecord(makeRecord({ contact: "04141234567" }));
  assert.ok(mapped.contactPrivate, "contactPrivate debe existir");
  // contactPrivate es String (no objeto) para coincidir con el schema de Prisma
  assert.equal(mapped.contactPrivate, "04141234567");
});

test("mapRecord almacena coordenadas en locationPrivate (nunca expuestas)", () => {
  const mapped = mapRecord(makeRecord({ latitude: 10.488, longitude: -66.879 }));
  assert.ok(mapped.locationPrivate, "locationPrivate debe existir");
  assert.equal(mapped.locationPrivate.lat, 10.488);
  assert.equal(mapped.locationPrivate.lng, -66.879);
});

// ---------------------------------------------------------------------------
// 4. Fallecidos — NUNCA se publican automáticamente
// ---------------------------------------------------------------------------

test("fallecidos tienen recordType deceased_person_private_only", () => {
  const mapped = mapRecord(makeFallecido());
  assert.equal(mapped.recordType, "deceased_person_private_only");
});

test("BLOCKED_AUTO_PUBLISH incluye deceased_person_private_only", () => {
  assert.ok(BLOCKED_AUTO_PUBLISH.has("deceased_person_private_only"));
});

test("fallecidos tienen privacyLevel private_only", () => {
  const mapped = mapRecord(makeFallecido());
  assert.equal(mapped.privacyLevel, "private_only");
  assert.equal(mapped.publicSafe.privacyLevel, "private_only");
});

test("publicSafe de fallecido no expone nombre real", () => {
  const mapped = mapRecord(makeFallecido({ person_name: "Nombre Real Privado" }));
  assert.notEqual(mapped.publicSafe.fullName, "Nombre Real Privado");
  // Debe ser texto protegido o undefined
  if (mapped.publicSafe.fullName !== undefined) {
    assert.ok(
      mapped.publicSafe.fullName.toLowerCase().includes("protegid") ||
      mapped.publicSafe.fullName.toLowerCase().includes("informacion"),
      "nombre de fallecido debe estar protegido en publicSafe"
    );
  }
});

// ---------------------------------------------------------------------------
// 5. Personas desaparecidas — privacyLevel restricted
// ---------------------------------------------------------------------------

test("persona_desaparecida tiene privacyLevel restricted", () => {
  const mapped = mapRecord(makeDesaparecido());
  assert.equal(mapped.privacyLevel, "restricted");
});

test("persona con age < 18 tiene privacyLevel restricted (menor de edad)", () => {
  const mapped = mapRecord(makeRecord({ record_type: "persona_hospitalizada", age: 7 }));
  assert.equal(mapped.privacyLevel, "restricted", "menores deben ser restricted sin importar el tipo");
});

test("persona con age >= 18 no es restricted solo por edad", () => {
  const mapped = mapRecord(makeRecord({ record_type: "persona_hospitalizada", age: 40 }));
  assert.equal(mapped.privacyLevel, "standard");
});

test("publicSafe de desaparecido no expone cedula ni telefono", () => {
  const mapped = mapRecord(makeDesaparecido());
  const pub = mapped.publicSafe;
  assert.equal(pub.cedula, undefined);
  assert.equal(pub.contact, undefined);
  assert.equal(pub.telefono, undefined);
});

// ---------------------------------------------------------------------------
// 6. Centros/recursos — publicSafe incluye datos operativos sin datos personales
// ---------------------------------------------------------------------------

test("centro_acopio tiene recordType collection_center", () => {
  const mapped = mapRecord(makeCentroAcopio());
  assert.equal(mapped.recordType, "collection_center");
});

test("centro de acopio en publicSafe no expone fullName individual", () => {
  const mapped = mapRecord(makeCentroAcopio());
  assert.equal(mapped.publicSafe.fullName, undefined, "centro no debe tener fullName personal");
});

test("centro de acopio expone nombre del centro en publicSafe", () => {
  const mapped = mapRecord(makeCentroAcopio());
  assert.ok(mapped.publicSafe.name, "centro debe tener nombre en publicSafe");
});

// ---------------------------------------------------------------------------
// 7. Deduplicación — apply evita duplicados por sourceRecordId
// ---------------------------------------------------------------------------

test("dry-run no escribe en la base de datos", async () => {
  const writes = [];
  const mockPrisma = {
    importedHumanitarianRecord: {
      findMany: async () => [],
      create: async (data) => { writes.push(data); return data; },
    },
  };

  // Mock del fetch global para evitar llamadas reales
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (url.includes("/api/network/stats")) {
      return { ok: true, json: async () => ({ total_records: 10, total_sources: 2, record_types: { persona_hospitalizada: 10 } }) };
    }
    if (url.includes("/api/records/feed")) {
      return { ok: true, json: async () => ({ records: [makeRecord()], next_cursor: 1, has_more: false, count: 1 }) };
    }
    throw new Error("URL inesperada: " + url);
  };

  try {
    const result = await runRedayudaImport({
      baseUrl: "http://localhost:8000",
      mode: "dry-run",
      maxRecords: 10,
      prismaClient: mockPrisma,
    });

    assert.equal(result.dryRun, true);
    assert.equal(writes.length, 0, "dry-run NO debe escribir en la DB");
    assert.equal(result.imported, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("apply con registro ya existente lo marca como duplicado y no reescribe", async () => {
  const creates = [];
  const EXISTING_ID = "hospitales_venezuela:abc123";

  const mockPrisma = {
    importedHumanitarianRecord: {
      findMany: async () => [{ sourceName: SOURCE_NAME, sourceRecordId: EXISTING_ID }],
      create: async (data) => { creates.push(data); return data; },
    },
  };

  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (url.includes("/api/network/stats")) {
      return { ok: true, json: async () => ({ total_records: 1, total_sources: 1, record_types: {} }) };
    }
    if (url.includes("/api/records/feed")) {
      return { ok: true, json: async () => ({ records: [makeRecord({ id: EXISTING_ID })], next_cursor: 1, has_more: false, count: 1 }) };
    }
    throw new Error("URL inesperada: " + url);
  };

  try {
    const result = await runRedayudaImport({
      baseUrl: "http://localhost:8000",
      mode: "apply",
      maxRecords: 10,
      prismaClient: mockPrisma,
    });

    assert.equal(creates.length, 0, "no debe crear duplicados");
    assert.equal(result.skippedDuplicates, 1);
    assert.equal(result.imported, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("apply importa registro nuevo que no existe en DB", async () => {
  const creates = [];

  const mockPrisma = {
    importedHumanitarianRecord: {
      findMany: async () => [],
      create: async (data) => { creates.push(data); return { id: "new" }; },
    },
  };

  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (url.includes("/api/network/stats")) {
      return { ok: true, json: async () => ({ total_records: 1, total_sources: 1, record_types: {} }) };
    }
    if (url.includes("/api/records/feed")) {
      return { ok: true, json: async () => ({ records: [makeRecord({ id: "nuevo:xyz" })], next_cursor: 1, has_more: false, count: 1 }) };
    }
    throw new Error("URL inesperada: " + url);
  };

  try {
    const result = await runRedayudaImport({
      baseUrl: "http://localhost:8000",
      mode: "apply",
      maxRecords: 10,
      prismaClient: mockPrisma,
    });

    assert.equal(creates.length, 1, "debe crear el registro nuevo");
    assert.equal(result.imported, 1);
    assert.equal(result.skippedDuplicates, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// 8. Fallecidos bloqueados en apply
// ---------------------------------------------------------------------------

test("fallecidos en apply se almacenan con verificationStatus NO_VERIFICADO y privacyLevel private_only", async () => {
  const creates = [];

  const mockPrisma = {
    importedHumanitarianRecord: {
      findMany: async () => [],
      create: async (data) => { creates.push(data.data ?? data); return { id: "f1" }; },
    },
  };

  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (url.includes("/api/network/stats")) {
      return { ok: true, json: async () => ({ total_records: 1, total_sources: 1, record_types: { fallecido: 1 } }) };
    }
    if (url.includes("/api/records/feed")) {
      return { ok: true, json: async () => ({ records: [makeFallecido()], next_cursor: 1, has_more: false, count: 1 }) };
    }
    throw new Error("URL inesperada: " + url);
  };

  try {
    const result = await runRedayudaImport({
      baseUrl: "http://localhost:8000",
      mode: "apply",
      maxRecords: 10,
      prismaClient: mockPrisma,
    });

    assert.equal(result.blockedAutoPublish, 1, "debe contabilizar fallecido como bloqueado");
    assert.ok(creates.length > 0, "fallecido SI se almacena en DB para revision admin");
    // Verificar que el registro almacenado tiene los atributos de privacidad correctos
    const stored = creates[0];
    assert.equal(stored.verificationStatus, "NO_VERIFICADO");
    assert.equal(stored.privacyLevel, "private_only");
    // publicSafe del fallecido NO debe mostrar nombre real
    if (stored.publicSafe?.fullName) {
      assert.ok(
        stored.publicSafe.fullName.toLowerCase().includes("protegid") ||
        stored.publicSafe.fullName.toLowerCase().includes("informacion"),
        "publicSafe de fallecido no debe revelar nombre"
      );
    }
  } finally {
    global.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// 9. family-search/public — cedula puede usarse para buscar pero nunca se muestra
// ---------------------------------------------------------------------------

test("publicSafe nunca contiene cedula aunque la cedula exista en el registro", () => {
  const cedulas = ["12345678", "V-12345678", "9876543"];
  for (const cedula of cedulas) {
    const mapped = mapRecord(makeDesaparecido({ cedula }));
    const pubStr = JSON.stringify(mapped.publicSafe);
    assert.ok(!pubStr.includes(cedula), `cedula ${cedula} NO debe aparecer en publicSafe`);
    // Pero sí debe estar en documentPrivate para búsqueda interna
    assert.equal(mapped.documentPrivate?.cedula, cedula, "cedula debe estar en documentPrivate para búsqueda interna");
  }
});

test("publicSafe nunca contiene numero de telefono", () => {
  const phones = ["04141234567", "+58 414-1234567", "04169999999"];
  for (const phone of phones) {
    const mapped = mapRecord(makeRecord({ contact: phone }));
    const pubStr = JSON.stringify(mapped.publicSafe);
    assert.ok(!pubStr.includes(phone.replace(/\D/g, "")), `telefono no debe aparecer en publicSafe`);
  }
});

// ---------------------------------------------------------------------------
// 10. Reporte de dry-run incluye contadores y riesgos de privacidad
// ---------------------------------------------------------------------------

test("dry-run report incluye contadores por tipo y riesgos de privacidad", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (url.includes("/api/network/stats")) {
      return {
        ok: true,
        json: async () => ({
          total_records: 50,
          total_sources: 3,
          record_types: { persona_hospitalizada: 30, persona_desaparecida: 15, fallecido: 5 },
        }),
      };
    }
    if (url.includes("/api/records/feed")) {
      return {
        ok: true,
        json: async () => ({
          records: [makeRecord(), makeDesaparecido(), makeFallecido()],
          next_cursor: 3,
          has_more: false,
          count: 3,
        }),
      };
    }
    throw new Error("URL inesperada: " + url);
  };

  try {
    const result = await runRedayudaImport({
      baseUrl: "http://localhost:8000",
      mode: "dry-run",
      maxRecords: 100,
    });

    assert.equal(result.dryRun, true);
    assert.ok(result.counts.total > 0, "debe tener registros procesados");
    assert.ok(result.counts.personas > 0, "debe tener personas");
    assert.ok(result.blockedAutoPublish >= 1, "debe detectar al menos un fallecido");
    assert.ok(result.sensitiveFieldsDetected.length > 0, "debe detectar campos sensibles");
    assert.ok(result.privacyRisks.length > 0, "debe tener riesgos de privacidad");
    assert.ok(result.examples.length > 0, "debe tener ejemplos sanitizados");
    // Los ejemplos NO deben contener datos privados
    for (const ex of result.examples) {
      const exStr = JSON.stringify(ex.publicSafe);
      assert.ok(!exStr.includes("12345678"), "ejemplo no debe contener cedula");
      assert.ok(!exStr.includes("04141234567"), "ejemplo no debe contener telefono");
    }
    assert.equal(result.imported, 0, "dry-run no importa nada");
  } finally {
    global.fetch = originalFetch;
  }
});

test("dry-run report identifica fallecidos como bloqueados para publicacion automatica", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (url.includes("/api/network/stats")) {
      return { ok: true, json: async () => ({ total_records: 2, total_sources: 1, record_types: { fallecido: 2 } }) };
    }
    if (url.includes("/api/records/feed")) {
      return {
        ok: true,
        json: async () => ({
          records: [makeFallecido({ id: "f:1" }), makeFallecido({ id: "f:2" })],
          next_cursor: 2,
          has_more: false,
          count: 2,
        }),
      };
    }
    throw new Error("URL inesperada: " + url);
  };

  try {
    const result = await runRedayudaImport({
      baseUrl: "http://localhost:8000",
      mode: "dry-run",
      maxRecords: 10,
    });

    assert.equal(result.blockedAutoPublish, 2);
    assert.ok(result.privacyRisks.some((r) => r.toLowerCase().includes("fallecid")));
  } finally {
    global.fetch = originalFetch;
  }
});
