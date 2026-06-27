export class AffectedZones {
  containsPoint(zone, point) {
    return Boolean(zone && point?.lat && point?.lng);
  }
}
