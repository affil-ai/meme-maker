import { db } from "../db";
import { projects, type Project } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { createInsertSchema } from "drizzle-zod";

export const insertProjectSchema = createInsertSchema(projects);
export type InsertProject = z.infer<typeof insertProjectSchema>;

// Create a new project
export async function createProject(data: InsertProject) {
  const [project] = await db.insert(projects).values(data).returning();
  return project;
}

// Get all projects
export async function getProjects(userId?: string) {
  return await db
    .select()
    .from(projects)
    .where(userId ? eq(projects.createdBy, userId) : undefined)
    .orderBy(desc(projects.lastModified));
}

// Get a single project by ID
export async function getProject(id: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id));
  
  return project;
}

// Update a project
export async function updateProject(id: string, data: Partial<Omit<Project, "id" | "createdAt">>) {
  const [updated] = await db
    .update(projects)
    .set(data)
    .where(eq(projects.id, id))
    .returning();
  
  return updated;
}

// Delete a project
export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id));
}

// Search projects by name
export async function searchProjects(query: string, userId?: string) {
  const baseQuery = db
    .select()
    .from(projects)
    .orderBy(desc(projects.lastModified));

  if (userId) {
    return await baseQuery.where(
      eq(projects.createdBy, userId)
    );
  }

  // For now, filter in memory. In production, you'd want to use 
  // PostgreSQL's full-text search or a search service
  const allProjects = await baseQuery;
  return allProjects.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase())
  );
}