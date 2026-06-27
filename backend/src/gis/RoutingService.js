export class RoutingService {
  estimateRoute(_origin, _destination) {
    return { status: "prepared", etaMinutes: null, route: [] };
  }
}
