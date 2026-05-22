import { treaty } from "@elysiajs/eden";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { env } from "@vboard/env/web";
import type { App } from "@vboard/server";
import { createEdenTanStackQuery } from "eden-tanstack-react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
});

export const edenClient = treaty<App>(env.VITE_SERVER_URL, {
  fetch: {
    credentials: "include",
  },
});

export const { EdenProvider, useEden, useEdenClient } =
  createEdenTanStackQuery<App>();
