"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Id, Doc } from "../../convex/_generated/dataModel";

interface ProjectContextType {
  projectId: Id<"projects"> | null;
  project: Doc<"projects"> | null;
  setProjectId: (id: Id<"projects"> | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}

interface ProjectProviderProps {
  children: ReactNode;
  projectId: Id<"projects"> | null;
  project: Doc<"projects"> | null;
  setProjectId: (id: Id<"projects"> | null) => void;
}

export function ProjectProvider({ children, projectId, project, setProjectId }: ProjectProviderProps) {
  return (
    <ProjectContext.Provider value={{ projectId, project, setProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}