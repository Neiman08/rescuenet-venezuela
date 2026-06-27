import { useEffect, useState } from "react";

export function usePublicResource(loader, fallback) {
  const [data, setData] = useState(fallback);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    loader()
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setStatus("success");
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setStatus("fallback");
      });

    return () => {
      active = false;
    };
  }, [loader]);

  return { data, status, error };
}
