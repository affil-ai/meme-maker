import { useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@meme-maker/backend";
import { useProject } from "~/contexts/ProjectContext";
import { toast } from "sonner";

export const useUndoRedo = () => {
  const { projectId } = useProject();
  
  // Queries
  const lastUndoableCommand = useQuery(
    api.commandHistory.getLastUndoableCommand,
    projectId ? { projectId } : "skip"
  );
  
  const lastRedoableCommand = useQuery(
    api.commandHistory.getLastRedoableCommand,
    projectId ? { projectId } : "skip"
  );
  
  const commandHistory = useQuery(
    api.commandHistory.getCommandHistory,
    projectId ? { projectId, limit: 20 } : "skip"
  );
  
  // Mutations
  const undo = useMutation(api.commandHistory.undo);
  const redo = useMutation(api.commandHistory.redo);
  
  const handleUndo = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const result = await undo({ projectId });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Failed to undo:", error);
      toast.error("Failed to undo action");
    }
  }, [projectId, undo]);
  
  const handleRedo = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const result = await redo({ projectId });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Failed to redo:", error);
      toast.error("Failed to redo action");
    }
  }, [projectId, redo]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }
      
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifier && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (modifier && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);
  
  return {
    canUndo: !!lastUndoableCommand,
    canRedo: !!lastRedoableCommand,
    handleUndo,
    handleRedo,
    lastUndoableCommand,
    lastRedoableCommand,
    commandHistory,
  };
};