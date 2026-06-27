import { fetchDynamicHumanitarianApp } from "./dynamicHumanitarianAppConnector.js";

export async function fetchTerremotoVenezuela(source) {
  return fetchDynamicHumanitarianApp(source);
}
