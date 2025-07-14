"use client";

import { useRouter } from "next/navigation";
import type { Id } from "@meme-maker/backend/convex/_generated/dataModel";
import { ProjectSelector } from "~/components/ProjectSelector";

export default function HomePage() {
  const router = useRouter();

  const handleSelectProject = (projectId: Id<"projects">) => {
    router.push(`/project/${projectId}`);
  };

  return <ProjectSelector onSelectProject={handleSelectProject} />;
}