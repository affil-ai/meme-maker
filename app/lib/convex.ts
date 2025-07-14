import { ConvexReactClient } from "convex/react";

const convexUrl = (import.meta as unknown as { env?: { VITE_CONVEX_URL?: string } }).env?.VITE_CONVEX_URL || process.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not set");
}

export const convex = new ConvexReactClient(convexUrl);