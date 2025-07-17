import { z } from "zod/v4";
import { tool, ToolSet } from "ai";
import { api } from "@meme-maker/backend";
import type { Id } from "@meme-maker/backend/convex/_generated/dataModel";
import { fetchMutation, fetchQuery } from "convex/nextjs";
const keyframeSchema = z.object({
  time: z.number(),
  properties: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rotation: z.number(),
    opacity: z.number(),
    scale: z.number(),
  }),
});

export const tools: ToolSet = {
  editClip: tool({
    description: "Edit a clip",
    inputSchema: z.object({
      clipId: z.string(),
      edit: z.object({
        startTime: z.number(),
        duration: z.number(),
        position: z.object({
          x: z.number(),
          y: z.number(),
        }),
      }),
    }),
    execute: async ({ clipId, edit }) => {
      const id = clipId as Id<"timelineClips">;
      const clip = await fetchQuery(api.timelineClips.get, { clipId: id });
      if (!clip) {
        return "Clip not found";
      }
      await fetchMutation(api.timelineClips.update, {
        clipId: id,
        duration: edit.duration,
        startTime: edit.startTime,
        position: edit.position,
      });
      return `Clip ${id} updated`;
    },
  }),

  getTimelineData: tool({
    description: "Get the timeline data for a project",
    inputSchema: z.object({
      projectId: z.string(),
    }),
    execute: async ({ projectId }) => {
      if (!projectId) {
        return "Project ID is required";
      }
      const id = projectId as Id<"projects">;
      const project = await fetchQuery(api.timeline.getTimelineData, {
        projectId: id,
      });
      if (!project) {
        return "Project not found";
      }
      return project.clips;
    },
  }),

  createKeyframe: tool({
    description: "Create a keyframe",
    inputSchema: z.object({
      clipId: z.string(),
      keyframe: keyframeSchema,
    }),
    execute: async ({ clipId, keyframe }) => {
      const id = clipId as Id<"timelineClips">;
      const clip = await fetchQuery(api.timelineClips.get, { clipId: id });
      if (!clip) {
        return "Clip not found";
      }
      await fetchMutation(api.keyframes.create, {
        clipId: id,
        time: keyframe.time,
        properties: keyframe.properties,
      });
      return "Keyframe created";
    },
  }),

  updateKeyframe: tool({
    description: "Update a keyframe",
    inputSchema: z.object({
      keyframeId: z.string(),
      keyframe: keyframeSchema,
    }),
    execute: async ({ keyframeId, keyframe }) => {
      const id = keyframeId as Id<"keyframes">;
      await fetchMutation(api.keyframes.update, {
        keyframeId: id,
        time: keyframe.time,
        properties: keyframe.properties,
      });
      return "Keyframe updated";
    },
  }),

  deleteKeyframe: tool({
    description: "Delete a keyframe",
    inputSchema: z.object({
      keyframeId: z.string(),
    }),
    execute: async ({ keyframeId }) => {
      const id = keyframeId as Id<"keyframes">;
      await fetchMutation(api.keyframes.remove, { keyframeId: id });
      return "Keyframe deleted";
    },
  }),

  fetchMediaAssets: tool({
    description: "Gets all the non text media assets and text media assets for the project",
    inputSchema: z.object({
      projectId: z.string(),
    }),
    execute: async ({ projectId }) => {
      if (!projectId) {
        return "Project ID is required";
      }
      const id = projectId as Id<"projects">;
      const projectAssets = await fetchQuery(api.mediaAssets.listByProject, {
        projectId: id,
      });
      const publicAssets = await fetchQuery(api.mediaAssets.listAllNonText, {});
      const allAssets = [...projectAssets, ...publicAssets];
      const uniqueAssetIds = [...new Set(allAssets.map(asset => asset._id))];
      const uniqueAssets = allAssets.filter(asset => uniqueAssetIds.includes(asset._id));
      return uniqueAssets;
    },
  }),

  createClip: tool({
    description: "Creates a clip with a given media asset. The size for the clip should match the dimensions of the media asset. The track index should be the highest outside of the project, unless otherwise specified.",
    inputSchema: z.object({
      projectId: z.string(),
      mediaAssetId: z.string(),
      trackIndex: z.number().default(0),
      startTime: z.number(),
      position: z.object({
        x: z.number().default(0),
        y: z.number().default(0),
      }).default({ x: 0, y: 0 }),
    }),
    execute: async ({ projectId, mediaAssetId, trackIndex, startTime, position }) => {
      const projectIdTyped = projectId as Id<"projects">;
      const mediaAssetIdTyped = mediaAssetId as Id<"mediaAssets">;
      
      const mediaAsset = await fetchQuery(api.mediaAssets.get, {
        assetId: mediaAssetIdTyped,
      });
      
      if (!mediaAsset) {
        return "Media asset not found";
      }
      
      const size = {
        width: mediaAsset.width,
        height: mediaAsset.height,
      };
      
      const duration = mediaAsset.duration || 5;
      
      const clipId = await fetchMutation(api.timelineClips.create, {
        projectId: projectIdTyped,
        mediaAssetId: mediaAssetIdTyped,
        trackIndex,
        startTime,
        duration,
        position,
        size,
        zIndex: 0,
        rotation: 0,
        opacity: 1,
        scale: 1,
      });
      
      return `Clip created with ID: ${clipId}`;
    },
  }),

  deleteClip: tool({
    description: "Deletes a clip",
    inputSchema: z.object({
      clipId: z.string(),
    }),
    execute: async ({ clipId }) => {
      const id = clipId as Id<"timelineClips">;
      const clip = await fetchQuery(api.timelineClips.get, { clipId: id });
      if (!clip) {
        return "Clip not found";
      }
      await fetchMutation(api.timelineClips.remove, { clipId: id });
      return `Clip ${id} deleted`;
    },
  }),
};