import { fetchDynamicHumanitarianApp } from "./dynamicHumanitarianAppConnector.js";

export async function fetchEncuentralos(source) {
  return fetchDynamicHumanitarianApp(source);
}
