import { createUploadthing, type FileRouter } from "uploadthing/server";
const f = createUploadthing();

export const uploadThingFileRouter = {
  // Upload media assets (videos, images, audio)
  mediaAsset: f({
    video: { maxFileSize: "512MB", maxFileCount: 1 },
    image: { maxFileSize: "16MB", maxFileCount: 1 },
    audio: { maxFileSize: "64MB", maxFileCount: 1 },
  })
    .onUploadComplete(async ({ metadata, file }) => {
      // This runs after upload is complete
      console.log("Upload complete for file:", file.name);
      console.log("File URL:", file.ufsUrl);
      console.log("File key:", file.key);
      console.log("Metadata:", metadata);

      // Return data to be sent to the client
      return { 
        fileKey: file.key,
        fileUrl: file.ufsUrl,
        fileName: file.name,
        fileSize: file.size,
      };
    }),

  // Upload project thumbnails
  projectThumbnail: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .onUploadComplete(async ({ metadata, file }) => {
      return { 
        fileKey: file.key,
        fileUrl: file.ufsUrl,
      };
    }),

  // Upload rendered videos
  renderedVideo: f({
    video: { maxFileSize: "2GB", maxFileCount: 1 },
  })
    .onUploadComplete(async ({ metadata, file }) => {
      return { 
        fileKey: file.key,
        fileUrl: file.ufsUrl,
        fileName: file.name,
        fileSize: file.size,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadThingFileRouter;