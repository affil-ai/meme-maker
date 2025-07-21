import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createCallerFactory, createTRPCRouter } from "./utils";
import { projectsRouter, mediaAssetsRouter, timelineClipsRouter } from "./routers";

/*
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    projects: projectsRouter,
    mediaAssets: mediaAssetsRouter,
    timelineClips: timelineClipsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);

export type AppRouterInputs = inferRouterInputs<AppRouter>;
export type AppRouterOutputs = inferRouterOutputs<AppRouter>;