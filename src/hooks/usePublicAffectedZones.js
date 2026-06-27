import { useEffect, useState } from "react";
import { publicApi } from "../lib/api";

export function usePublicAffectedZones() {
  const [zones, setZones] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    publicApi.getAffectedZones()
      .then((payload) => {
        if (!active) return;
        setZones(payload?.data || []);
        setStatus(payload?.data?.length ? "success" : "empty");
      })
      .catch(() => {
        if (!active) return;
        setZones([]);
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  return { zones, status, ready: status === "success" && zones.length > 0 };
}

export function zoneLabel(zone) {
  return [zone.sector, zone.parish, zone.municipality, zone.state].filter(Boolean).join(" - ");
}
