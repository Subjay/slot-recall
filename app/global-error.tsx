"use client";

import { useEffect } from "react";

export default function GlobalWebAppError({
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
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <div>
          <h2>Sorry, something went wrong!</h2>
          <button onClick={() => unstable_retry()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
