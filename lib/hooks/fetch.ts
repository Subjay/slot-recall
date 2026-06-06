"use client";

import { useState, useEffect } from "react";

interface HookFetchResponse<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
}

export function useFetch<T>(url: string): HookFetchResponse<T> {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(undefined);

  useEffect(() => {
    setLoading(true);

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [url]);

  return { data, loading, error };
}
