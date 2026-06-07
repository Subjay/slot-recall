"use client";

import { useState, useEffect } from "react";

interface HookFetchResponse<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
}

async function readResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const body = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return body as T;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown request error";
}

export function useFetch<T>(
  url: string,
  refreshKey = 0,
): HookFetchResponse<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetch(url)
      .then((res) => readResponse<T>(res))
      .then((data) => {
        setData(data);
        setError(undefined);
        setLoading(false);
      })
      .catch((err) => {
        setError(getErrorMessage(err));
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
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const requestBody = JSON.stringify(values);

  useEffect(() => {
    fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: requestBody,
    })
      .then((res) => readResponse<T>(res))
      .then((data) => {
        setData(data);
        setError(undefined);
        setLoading(false);
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      });
  }, [url, requestBody, refreshKey]);

  return { data, loading, error };
}
