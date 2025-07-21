"use client";

import { createContext, useContext, type ReactNode } from "react";
import { AppRouterOutputs } from "@meme-maker/backend/trpc";
type Project = AppRouterOutputs["projects"]["get"];
interface ProjectContextType {
  projectId: string | null;
  project: Project | null;
  setProjectId: (id: string | null) => void;
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
  projectId: string | null;
  project: Project | null;
  setProjectId: (id: string | null) => void;
}

export function ProjectProvider({ children, projectId, project, setProjectId }: ProjectProviderProps) {
  return (
    <ProjectContext.Provider value={{ projectId, project, setProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}