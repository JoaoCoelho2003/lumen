"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";

const showQueryDevtools =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_MODE === "dev";

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}

        {showQueryDevtools ? (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-left" />
        ) : null}
      </QueryClientProvider>
    </SessionProvider>
  );
}
