import { fetchRequestHandler } from "@meme-maker/backend/trpc";
import { appRouter } from "@meme-maker/backend/trpc/root";
import { NextRequest } from "next/server";

const handler = (req: NextRequest) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({}),
    onError:
    process.env.NODE_ENV === "development"
      ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
          );
        }
      : undefined
    
  });
};

export { handler as GET, handler as POST };