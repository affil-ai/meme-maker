"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { ProjectSelector } from "~/components/ProjectSelector";
import { ProjectProvider } from "~/contexts/ProjectContext";
import TimelineEditor from "~/components/TimelineEditor";

export default function HomePage() {
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const selectedProject = useQuery(
    api.projects.get,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );

  if (!selectedProjectId) {
    return <ProjectSelector onSelectProject={setSelectedProjectId} />;
  }

  return (
    <ProjectProvider
      projectId={selectedProjectId}
      project={selectedProject || null}
      setProjectId={setSelectedProjectId}
    >
      <TimelineEditor />
    </ProjectProvider>
  );
}