"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@meme-maker/backend";
import type { Id } from "@meme-maker/backend/convex/_generated/dataModel";
import { ProjectProvider } from "~/contexts/ProjectContext";
import TimelineEditor from "~/components/TimelineEditor";
import { useEffect } from "react";

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as Id<"projects">;
  
  const project = useQuery(api.projects.get, { projectId });

  useEffect(() => {
    // If project doesn't exist or there's an error, redirect to home
    if (project === null) {
      router.push("/");
    }
  }, [project, router]);

  // Loading state
  if (project === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  // Project not found
  if (project === null) {
    return null; // Will redirect in useEffect
  }

  return (
    <ProjectProvider
      projectId={projectId}
      project={project}
      setProjectId={() => router.push("/")}
    >
      <TimelineEditor />
    </ProjectProvider>
  );
}