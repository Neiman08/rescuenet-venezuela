export class GeoValidation {
  isValidCoordinate({ lat, lng }) {
    return Number(lat) >= -90 && Number(lat) <= 90 && Number(lng) >= -180 && Number(lng) <= 180;
  }
}
