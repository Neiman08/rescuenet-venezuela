import { fetchPublicSource } from "./publicSourceDiscovery.js";

export async function scrapeVzlAyuda(source) {
  return fetchPublicSource(source);
}
