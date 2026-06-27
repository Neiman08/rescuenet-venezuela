export const aiPipelines = [
  {
    id: "ai-triage",
    name: "Clasificacion automatica de emergencias",
    purpose: "Sugerir severidad, tipo y prioridad operativa a partir de texto, fotos y canal de entrada.",
    inputs: ["descripcion", "zona_afectada_id", "canal", "adjuntos_protegidos"],
    outputs: ["tipo_sugerido", "severidad_sugerida", "confianza", "razones"],
    humanReview: "Coordinador de rescate valida antes de despacho.",
  },
  {
    id: "ai-duplicate",
    name: "Deteccion de duplicados",
    purpose: "Reducir reportes repetidos sin borrar evidencia ni historial.",
    inputs: ["ubicacion_aproximada", "tipo", "hora", "descripcion_normalizada"],
    outputs: ["posibles_duplicados", "score", "recomendacion_merge"],
    humanReview: "Administrador o coordinador confirma fusion.",
  },
  {
    id: "ai-family-match",
    name: "Coincidencias familiar-rescatado",
    purpose: "Sugerir coincidencias por foto, edad, zona, ropa y senas particulares.",
    inputs: ["foto_protegida", "edad", "zona", "senas", "ropa"],
    outputs: ["candidatos", "porcentaje", "factores_de_coincidencia"],
    humanReview: "Verificacion humana obligatoria antes de contacto familiar.",
  },
];

export const aiSafetyRules = [
  "No tomar decisiones finales sin revision humana.",
  "No publicar fotos, documentos ni ubicaciones sensibles como salida publica.",
  "Registrar prompt, version de modelo, decision sugerida y revisor humano en audit_logs.",
  "Separar datos identificables de datos operativos siempre que sea posible.",
  "Permitir apelacion y correccion manual de coincidencias o clasificaciones.",
];
