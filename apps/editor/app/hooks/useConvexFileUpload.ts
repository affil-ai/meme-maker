import { useMutation, useAction } from "convex/react";
import { api } from "@meme-maker/backend";
import type { Id } from "@meme-maker/backend/convex/_generated/dataModel";
import { toast } from "sonner";

export function useConvexFileUpload() {
  const generateUploadUrl = useMutation(api.mediaAssets.generateUploadUrl);
  const completeUpload = useAction(api.fileStorage.completeUpload);
  const updateProgress = useMutation(api.mediaAssets.update);

  const uploadFile = async (
    file: File,
    assetId: Id<"mediaAssets">,
    onProgress?: (progress: number) => void
  ) => {
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Create XMLHttpRequest for progress tracking
      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress?.(progress);
            
            // Update progress in database
            updateProgress({
              assetId,
              uploadProgress: progress,
              uploadStatus: progress === 100 ? "processing" : "uploading",
            });
          }
        });
        
        xhr.addEventListener("load", async () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            const storageId = response.storageId;
            
            // Complete the upload
            await completeUpload({ storageId, assetId });
            
            resolve(storageId);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });
        
        xhr.open("POST", uploadUrl);
        xhr.send(file);
      });
    } catch (error) {
      // Update asset status to failed
      await updateProgress({
        assetId,
        uploadStatus: "failed",
      });
      
      toast.error("Failed to upload file");
      throw error;
    }
  };

  return { uploadFile };
}