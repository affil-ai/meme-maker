/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as commandHistory from "../commandHistory.js";
import type * as fileStorage from "../fileStorage.js";
import type * as keyframes from "../keyframes.js";
import type * as mediaAssets from "../mediaAssets.js";
import type * as projects from "../projects.js";
import type * as renderJobs from "../renderJobs.js";
import type * as timeline from "../timeline.js";
import type * as timelineClips from "../timelineClips.js";
import type * as types from "../types.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  commandHistory: typeof commandHistory;
  fileStorage: typeof fileStorage;
  keyframes: typeof keyframes;
  mediaAssets: typeof mediaAssets;
  projects: typeof projects;
  renderJobs: typeof renderJobs;
  timeline: typeof timeline;
  timelineClips: typeof timelineClips;
  types: typeof types;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
