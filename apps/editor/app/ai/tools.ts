import { z } from "zod/v4";
import { tool, ToolSet } from "ai";
import { api } from "@meme-maker/backend";
import textToSpeech from "@google-cloud/text-to-speech";
import type { Id } from "@meme-maker/backend/convex/_generated/dataModel";
import { fetchAction, fetchMutation, fetchQuery } from "convex/nextjs";
const keyframeSchema = z.object({
  time: z.number(),
  properties: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rotation: z.number(),
    opacity: z.number(),
    scale: z.number(),
  }),
});

export const tools: ToolSet = {
  editClip: tool({
    description: "Edit a clip",
    inputSchema: z.object({
      clipId: z.string(),
      edit: z.object({
        startTime: z.number(),
        duration: z.number(),
        position: z.object({
          x: z.number(),
          y: z.number(),
        }),
      }),
    }),
    execute: async ({ clipId, edit }) => {
      const id = clipId as Id<"timelineClips">;
      const clip = await fetchQuery(api.timelineClips.get, { clipId: id });
      if (!clip) {
        return "Clip not found";
      }
      await fetchMutation(api.timelineClips.update, {
        clipId: id,
        duration: edit.duration,
        startTime: edit.startTime,
        position: edit.position,
      });
      return `Clip ${id} updated`;
    },
  }),

  getTimelineData: tool({
    description: "Get the timeline data for a project",
    inputSchema: z.object({
      projectId: z.string(),
    }),
    execute: async ({ projectId }) => {
      if (!projectId) {
        return "Project ID is required";
      }
      const id = projectId as Id<"projects">;
      const project = await fetchQuery(api.timeline.getTimelineData, {
        projectId: id,
      });
      if (!project) {
        return "Project not found";
      }
      return project.clips;
    },
  }),

  createKeyframe: tool({
    description: "Create a keyframe",
    inputSchema: z.object({
      clipId: z.string(),
      keyframe: keyframeSchema,
    }),
    execute: async ({ clipId, keyframe }) => {
      const id = clipId as Id<"timelineClips">;
      const clip = await fetchQuery(api.timelineClips.get, { clipId: id });
      if (!clip) {
        return "Clip not found";
      }
      await fetchMutation(api.keyframes.create, {
        clipId: id,
        time: keyframe.time,
        properties: keyframe.properties,
      });
      return "Keyframe created";
    },
  }),

  updateKeyframe: tool({
    description: "Update a keyframe",
    inputSchema: z.object({
      keyframeId: z.string(),
      keyframe: keyframeSchema,
    }),
    execute: async ({ keyframeId, keyframe }) => {
      const id = keyframeId as Id<"keyframes">;
      await fetchMutation(api.keyframes.update, {
        keyframeId: id,
        time: keyframe.time,
        properties: keyframe.properties,
      });
      return "Keyframe updated";
    },
  }),

  deleteKeyframe: tool({
    description: "Delete a keyframe",
    inputSchema: z.object({
      keyframeId: z.string(),
    }),
    execute: async ({ keyframeId }) => {
      const id = keyframeId as Id<"keyframes">;
      await fetchMutation(api.keyframes.remove, { keyframeId: id });
      return "Keyframe deleted";
    },
  }),

  fetchMediaAssets: tool({
    description: "Gets all the non text media assets and text media assets for the project",
    inputSchema: z.object({
      projectId: z.string(),
    }),
    execute: async ({ projectId }) => {
      if (!projectId) {
        return "Project ID is required";
      }
      const id = projectId as Id<"projects">;
      const projectAssets = await fetchQuery(api.mediaAssets.listByProject, {
        projectId: id,
      });
      const publicAssets = await fetchQuery(api.mediaAssets.listAllNonText, {});
      const allAssets = [...projectAssets, ...publicAssets];
      const uniqueAssetIds = [...new Set(allAssets.map(asset => asset._id))];
      const uniqueAssets = allAssets.filter(asset => uniqueAssetIds.includes(asset._id));
      return uniqueAssets;
    },
  }),

  createClip: tool({
    description: "Creates a clip with a given media asset. The size for the clip should match the dimensions of the media asset. The track index should be the highest outside of the project, unless otherwise specified.",
    inputSchema: z.object({
      projectId: z.string(),
      mediaAssetId: z.string(),
      trackIndex: z.number().default(0),
      startTime: z.number(),
      position: z.object({
        x: z.number().default(0),
        y: z.number().default(0),
      }).default({ x: 0, y: 0 }),
    }),
    execute: async ({ projectId, mediaAssetId, trackIndex, startTime, position }) => {
      const projectIdTyped = projectId as Id<"projects">;
      const mediaAssetIdTyped = mediaAssetId as Id<"mediaAssets">;
      
      const mediaAsset = await fetchQuery(api.mediaAssets.get, {
        assetId: mediaAssetIdTyped,
      });
      
      if (!mediaAsset) {
        return "Media asset not found";
      }
      
      const size = {
        width: mediaAsset.width,
        height: mediaAsset.height,
      };
      
      const duration = mediaAsset.duration || 5;
      
      const clipId = await fetchMutation(api.timelineClips.create, {
        projectId: projectIdTyped,
        mediaAssetId: mediaAssetIdTyped,
        trackIndex,
        startTime,
        duration,
        position,
        size,
        zIndex: 0,
        rotation: 0,
        opacity: 1,
        scale: 1,
      });
      
      return `Clip created with ID: ${clipId}`;
    },
  }),

  deleteClip: tool({
    description: "Deletes a clip",
    inputSchema: z.object({
      clipId: z.string(),
    }),
    execute: async ({ clipId }) => {
      const id = clipId as Id<"timelineClips">;
      const clip = await fetchQuery(api.timelineClips.get, { clipId: id });
      if (!clip) {
        return "Clip not found";
      }
      await fetchMutation(api.timelineClips.remove, { clipId: id });
      return `Clip ${id} deleted`;
    },
  }),

  createAudioMediaAsset: tool({
    description: "Creates an audio media asset from a text input",
    inputSchema: z.object({
      projectId: z.string(),
      text: z.string(),
    }),
    execute: async ({ projectId, text }) => {
      const projectIdTyped = projectId as Id<"projects">;
      
      // Generate audio using Google Text-to-Speech
      const client = new textToSpeech.TextToSpeechClient();
      const [response] = await client.synthesizeSpeech({
        input: { text },
        voice: { languageCode: "en-US", name: "en-US-Chirp3-HD-Algenib", ssmlGender: "MALE" },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 1.1,
        },
      });
      
      const audioContent = response.audioContent;
      if (!audioContent || !(audioContent instanceof Uint8Array) || !(audioContent instanceof Buffer)) {
        return "Failed to generate audio from text";
      }
      
      // Convert audio buffer to Blob
      const audioBlob = new Blob([audioContent.buffer], { type: "audio/mp3" });
      const audioFile = new File([audioBlob], `tts-${Date.now()}.mp3`, { type: "audio/mp3" });
      
      // Get audio duration
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      const duration = await new Promise<number>((resolve) => {
        audio.addEventListener("loadedmetadata", () => {
          resolve(audio.duration);
          URL.revokeObjectURL(audioUrl);
        });
        audio.addEventListener("error", () => {
          URL.revokeObjectURL(audioUrl);
          resolve(5); // Default 5 seconds on error
        });
      });
      
      // Create media asset record in database
      const assetId = await fetchMutation(api.mediaAssets.create, {
        projectId: projectIdTyped,
        mediaType: "audio",
        name: `TTS: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`,
        duration,
        width: 0,
        height: 0,
      });
      
      // Generate upload URL and upload the audio file
      const uploadUrl = await fetchMutation(api.mediaAssets.generateUploadUrl);
      
      // Upload using XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            // Update progress in database
            fetchMutation(api.mediaAssets.update, {
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
            await fetchAction(api.fileStorage.completeUpload, { 
              storageId, 
              assetId 
            });
            
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });
        
        xhr.open("POST", uploadUrl);
        xhr.send(audioFile);
      });
      
      return `Audio media asset created with ID: ${assetId}`;
    },
  }),
};