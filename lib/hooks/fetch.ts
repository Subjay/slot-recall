"use client";

import { useState, useEffect } from "react";

interface HookFetchResponse<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
}

export function useFetch<T>(
  url: string,
  refreshKey = 0,
): HookFetchResponse<T> {
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
  }, [url, refreshKey]);

  return { data, loading, error };
}

export function usePostFetch<T>(
  url: string,
  values: object,
  refreshKey = 0,
): HookFetchResponse<T> {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(undefined);

  useEffect(() => {
    setLoading(true);

    fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Context-Type": "application/json",
      },
      body: JSON.stringify(values),
    })
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [url, refreshKey]);

  return { data, loading, error };
}
