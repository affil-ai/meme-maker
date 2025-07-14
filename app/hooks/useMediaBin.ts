import { useCallback, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useProject } from "~/contexts/ProjectContext";
import { useConvexFileUpload } from "./useConvexFileUpload";
import type { MediaBinItem } from "~/components/timeline/types";
import { generateUUID } from "~/utils/uuid";
import { toast } from "sonner";

// Helper to get media metadata
const getMediaMetadata = (file: File, mediaType: "video" | "image" | "audio"): Promise<{
  durationInSeconds?: number;
  width: number;
  height: number;
}> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);

    if (mediaType === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const durationInSeconds = video.duration;

        URL.revokeObjectURL(url);
        resolve({
          durationInSeconds: isFinite(durationInSeconds) ? durationInSeconds : undefined,
          width,
          height
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load video metadata"));
      };

      video.src = url;
    } else if (mediaType === "image") {
      const img = new Image();

      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        URL.revokeObjectURL(url);
        resolve({
          durationInSeconds: undefined,
          width,
          height
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image metadata"));
      };

      img.src = url;
    } else if (mediaType === "audio") {
      const audio = document.createElement("audio");
      audio.preload = "metadata";

      audio.onloadedmetadata = () => {
        const durationInSeconds = audio.duration;

        URL.revokeObjectURL(url);
        resolve({
          durationInSeconds: isFinite(durationInSeconds) ? durationInSeconds : undefined,
          width: 0,
          height: 0
        });
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load audio metadata"));
      };

      audio.src = url;
    }
  });
};

export const useMediaBin = (handleDeleteScrubbersByMediaBinId: (mediaBinId: string) => void) => {
  const { projectId } = useProject();
  const { uploadFile } = useConvexFileUpload();
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: MediaBinItem;
  } | null>(null);
  
  // Convex queries
  const mediaAssets = useQuery(
    api.mediaAssets.listByProject,
    projectId ? { projectId } : "skip"
  );
  
  // Convex mutations
  const createMediaAsset = useMutation(api.mediaAssets.create);
  const updateMediaAsset = useMutation(api.mediaAssets.update);
  const deleteMediaAsset = useMutation(api.mediaAssets.remove);
  
  // Convert Convex media assets to MediaBinItem format with resolved URLs
  const mediaBinItems: MediaBinItem[] = (mediaAssets || []).map(asset => ({
    id: asset._id,
    name: asset.name,
    mediaType: asset.mediaType,
    mediaUrl: asset.storageUrl || null,
    media_width: asset.width,
    media_height: asset.height,
    text: asset.textProperties || null,
    durationInSeconds: asset.duration,
    isUploading: asset.uploadStatus === "uploading",
    uploadProgress: asset.uploadProgress || null,
  }));
  
  const handleAddMediaToBin = useCallback(async (file: File) => {
    if (!projectId) {
      toast.error("Please select a project first");
      return;
    }
    
    const name = file.name;
    let mediaType: "video" | "image" | "audio";
    if (file.type.startsWith("video/")) mediaType = "video";
    else if (file.type.startsWith("image/")) mediaType = "image";
    else if (file.type.startsWith("audio/")) mediaType = "audio";
    else {
      toast.error("Unsupported file type. Please select a video, image, or audio file.");
      return;
    }
    
    try {
      // Get metadata
      const metadata = await getMediaMetadata(file, mediaType);
      
      // Create media asset in database
      const assetId = await createMediaAsset({
        projectId,
        name,
        mediaType,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.durationInSeconds || 0,
      });
      
      // Upload file to Convex storage
      const storageId = await uploadFile(file, assetId, (progress) => {
        // Progress is handled by the upload hook
        console.log(`Upload progress for ${name}: ${progress}%`);
      });
      
      toast.success(`Added ${name} to media bin`);
    } catch (error) {
      console.error("Failed to add media:", error);
      toast.error(`Failed to add ${name}`);
    }
  }, [projectId, createMediaAsset, uploadFile]);
  
  const handleAddTextToBin = useCallback(async (
    textContent: string,
    fontSize: number,
    fontFamily: string,
    color: string,
    textAlign: "left" | "center" | "right",
    fontWeight: "normal" | "bold"
  ) => {
    if (!projectId) {
      toast.error("Please select a project first");
      return;
    }
    
    try {
      await createMediaAsset({
        projectId,
        name: textContent,
        mediaType: "text",
        width: 0,
        height: 0,
        duration: 0,
        textProperties: {
          textContent,
          fontSize,
          fontFamily,
          color,
          textAlign,
          fontWeight,
        },
      });
      
      toast.success("Added text to media bin");
    } catch (error) {
      console.error("Failed to add text:", error);
      toast.error("Failed to add text");
    }
  }, [projectId, createMediaAsset]);
  
  const handleDeleteMedia = useCallback(async (item: MediaBinItem) => {
    const assetId = item.id as Id<"mediaAssets">;
    
    try {
      await deleteMediaAsset({ assetId });
      // Also delete associated timeline clips
      handleDeleteScrubbersByMediaBinId(item.id);
      toast.success(`Deleted ${item.name}`);
    } catch (error) {
      console.error("Failed to delete media:", error);
      toast.error("Failed to delete media");
    }
  }, [deleteMediaAsset, handleDeleteScrubbersByMediaBinId]);
  
  const handleSplitAudio = useCallback(async (videoItem: MediaBinItem) => {
    if (!projectId) {
      toast.error("Please select a project first");
      return;
    }
    
    if (videoItem.mediaType !== 'video') {
      toast.error('Can only split audio from video files');
      return;
    }
    
    try {
      // Create a new audio asset that references the same storage file
      await createMediaAsset({
        projectId,
        name: `${videoItem.name} (Audio)`,
        mediaType: "audio",
        width: 0,
        height: 0,
        duration: videoItem.durationInSeconds,
      });
      
      toast.success(`Created audio track from ${videoItem.name}`);
      setContextMenu(null);
    } catch (error) {
      console.error('Error splitting audio:', error);
      toast.error('Failed to split audio');
    }
  }, [projectId, createMediaAsset]);
  
  const handleContextMenu = useCallback((e: React.MouseEvent, item: MediaBinItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
    });
  }, []);
  
  const handleDeleteFromContext = useCallback(async () => {
    if (!contextMenu) return;
    await handleDeleteMedia(contextMenu.item);
    setContextMenu(null);
  }, [contextMenu, handleDeleteMedia]);
  
  const handleSplitAudioFromContext = useCallback(async () => {
    if (!contextMenu) return;
    await handleSplitAudio(contextMenu.item);
  }, [contextMenu, handleSplitAudio]);
  
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);
  
  return {
    mediaBinItems,
    handleAddMediaToBin,
    handleAddTextToBin,
    handleDeleteMedia,
    handleSplitAudio,
    contextMenu,
    handleContextMenu,
    handleDeleteFromContext,
    handleSplitAudioFromContext,
    handleCloseContextMenu,
  };
};