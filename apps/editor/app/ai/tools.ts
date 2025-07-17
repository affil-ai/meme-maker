import { z } from "zod/v4";
import { tool, ToolSet } from "ai";
import { api } from "@meme-maker/backend";
import type { Id } from "@meme-maker/backend/convex/_generated/dataModel";
import { fetchMutation, fetchQuery } from "convex/nextjs";

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
                return 'Clip not found';
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
                return 'Project ID is required';
            }
            const id = projectId as Id<"projects">;
            const project = await fetchQuery(api.timeline.getTimelineData, { projectId: id });
            if (!project) {
                return 'Project not found';
            }
            return project.clips;
        },
    }),


}
