import { useCallback, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@meme-maker/backend";
import { useProject } from "~/contexts/ProjectContext";
import { toast } from "sonner";
import type { Id } from "@meme-maker/backend/convex/_generated/dataModel";

export const useCheckpoint = () => {
  const { projectId } = useProject();
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Queries
  const checkpoints = useQuery(
    api.checkpoints.getCheckpoints,
    projectId ? { projectId } : "skip"
  );
  
  // Mutations
  const createCheckpointMutation = useMutation(api.checkpoints.createCheckpoint);
  const restoreCheckpointMutation = useMutation(api.checkpoints.restoreCheckpoint);
  const deleteCheckpointMutation = useMutation(api.checkpoints.deleteCheckpoint);
  
  const createCheckpoint = useCallback(async (name: string, description?: string) => {
    if (!projectId) {
      toast.error("No project selected");
      return;
    }
    
    setIsCreating(true);
    try {
      const result = await createCheckpointMutation({
        projectId,
        name,
        description,
      });
      
      if (result.success) {
        toast.success(`Checkpoint "${name}" created successfully`);
        return result.checkpointId;
      }
    } catch (error) {
      console.error("Failed to create checkpoint:", error);
      toast.error("Failed to create checkpoint");
    } finally {
      setIsCreating(false);
    }
  }, [projectId, createCheckpointMutation]);
  
  const restoreCheckpoint = useCallback(async (checkpointId: Id<"checkpoints">) => {
    setIsRestoring(true);
    try {
      const result = await restoreCheckpointMutation({ checkpointId });
      
      if (result.success) {
        toast.success(result.message);
      }
    } catch (error) {
      console.error("Failed to restore checkpoint:", error);
      toast.error("Failed to restore checkpoint");
    } finally {
      setIsRestoring(false);
    }
  }, [restoreCheckpointMutation]);
  
  const deleteCheckpoint = useCallback(async (checkpointId: Id<"checkpoints">) => {
    try {
      const result = await deleteCheckpointMutation({ checkpointId });
      
      if (result.success) {
        toast.success("Checkpoint deleted successfully");
      }
    } catch (error) {
      console.error("Failed to delete checkpoint:", error);
      toast.error("Failed to delete checkpoint");
    }
  }, [deleteCheckpointMutation]);
  
  return {
    checkpoints: checkpoints || [],
    createCheckpoint,
    restoreCheckpoint,
    deleteCheckpoint,
    isCreating,
    isRestoring,
  };
};