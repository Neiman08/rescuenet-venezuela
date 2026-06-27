import { fetchDynamicHumanitarianApp } from "./dynamicHumanitarianAppConnector.js";

export async function fetchVenezuelaTeBusca(source) {
  return fetchDynamicHumanitarianApp(source);
}
