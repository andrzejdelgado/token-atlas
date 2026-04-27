"use client";

import { useState, useEffect } from "react";

interface DistinctTokenValues {
  labels: string[];
  components: string[];
}

export function useDistinctTokenValues(collectionId?: string): DistinctTokenValues {
  const [values, setValues] = useState<DistinctTokenValues>({ labels: [], components: [] });

  useEffect(() => {
    const url = collectionId
      ? `/api/tokens/distinct?collection=${collectionId}`
      : "/api/tokens/distinct";

    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setValues({ labels: data.labels ?? [], components: data.components ?? [] });
      })
      .catch(() => {});
  }, [collectionId]);

  return values;
}
