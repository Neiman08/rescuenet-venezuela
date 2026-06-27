function trustBase(source) {
  const trust = source.trustLevel || "medium";
  if (trust === "high") return { score: 82, factor: "official_or_humanitarian_source" };
  if (trust === "recognized_media") return { score: 68, factor: "recognized_media" };
  if (trust === "manual_review_required") return { score: 45, factor: "manual_file_review_required" };
  if (trust === "low") return { score: 35, factor: "low_trust_source" };
  return { score: 55, factor: "public_source" };
}

function confidenceLevel(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

export class DataQualityScoringService {
  static score(record, source, existing = []) {
    const base = trustBase(source);
    const factors = [base.factor];
    let score = base.score;

    if (record.possibleDuplicate) {
      score -= 12;
      factors.push("possible_duplicate");
    }

    const corroborated = existing.some((item) =>
      item.sourceName !== record.sourceName
      && item.recordType === record.recordType
      && ((record.fullName && item.fullName === record.fullName) || (record.name && item.name === record.name)),
    );
    if (corroborated) {
      score += 10;
      factors.push("corroborated_by_multiple_sources");
    }

    if (record.rawPayload?.sourceSheet || record.rawPayload?.sourceRowNumber) factors.push("structured_file_row");
    if (record.contactPrivate || record.contactInfoPrivate) factors.push("private_contact_available_for_review");
    if (record.publicSafe) factors.push("public_safe_generated");

    const confidenceScore = Math.max(0, Math.min(100, Math.round(score)));
    return {
      ...record,
      confidenceScore,
      confidenceLevel: confidenceLevel(confidenceScore),
      confidenceFactors: factors,
    };
  }

  static scoreMany(records, source, existing = []) {
    return records.map((record) => this.score(record, source, existing));
  }
}
