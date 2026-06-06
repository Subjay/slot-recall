"use client";

import { useEffect } from "react";

export default function WebAppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong in global layout.tsx!</h2>
      <button onClick={() => unstable_retry()}>Try again</button>
    </div>
  );
}
