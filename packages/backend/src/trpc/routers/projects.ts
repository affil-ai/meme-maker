import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  searchProjects,
} from "~/api/projects";

export const projectsRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        createdBy: z.string().uuid().optional(),
        thumbnail: z.string().optional(),
        settings: z.object({
          fps: z.number(),
          resolution: z.object({
            width: z.number(),
            height: z.number(),
          }),
          duration: z.number(),
        }),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      return await createProject(input);
    }),

  list: publicProcedure
    .input(
      z.object({
        userId: z.string().uuid().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await getProjects(input?.userId);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const project = await getProject(input.id);
      if (!project) {
        throw new Error("Project not found");
      }
      return project;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          createdBy: z.string().uuid().optional(),
          thumbnail: z.string().optional(),
          settings: z.object({
            fps: z.number(),
            resolution: z.object({
              width: z.number(),
              height: z.number(),
            }),
            duration: z.number(),
          }).optional(),
          isPublic: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return await updateProject(input.id, input.data);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await deleteProject(input.id);
      return { success: true };
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
        userId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input }) => {
      return await searchProjects(input.query, input.userId);
    }),
});