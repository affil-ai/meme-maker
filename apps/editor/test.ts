import "dotenv/config";
import { api } from "@meme-maker/backend";
import { fetchMutation } from "convex/nextjs";
import { fetchAction } from "convex/nextjs";
import textToSpeech from "@google-cloud/text-to-speech";
import type { Id } from "@meme-maker/backend/convex/_generated/dataModel";
import { parseBuffer } from "music-metadata";

async function main() {
  console.log("Starting audio upload test...");
  const projectId = "jd7927x20m1v6pmybadqtr361x7kqdz2" as Id<"projects">;
  const text = "Hello, world!";
  if (!process.env.GCP_CREDENTIALS) {
    throw new Error("GCP_CREDENTIALS is not set");
  }
  console.log("GCP credentials found");
  // Generate audio using Google Text-to-Speech
  const client = new textToSpeech.TextToSpeechClient({
    credentials: JSON.parse(
      Buffer.from(process.env.GCP_CREDENTIALS, "base64").toString("utf-8")
    ),
  });
  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: {
      languageCode: "en-US",
      name: "en-US-Chirp3-HD-Algenib",
      ssmlGender: "MALE",
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 1.1,
    },
  });

  const audioContent = response.audioContent;
  if (!audioContent) {
    return "Failed to generate audio from text";
  }
  console.log("Audio generated successfully, size:", audioContent.length, "bytes");

  // Convert audio buffer to Blob - audioContent is a Buffer in Node.js
  const audioBuffer = Buffer.isBuffer(audioContent) 
    ? audioContent 
    : Buffer.from(audioContent as Uint8Array);
  
  // Calculate actual audio duration using music-metadata
  let duration = 5; // Default fallback
  try {
    const metadata = await parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' });
    if (metadata.format.duration) {
      duration = metadata.format.duration;
      console.log("Calculated audio duration:", duration, "seconds");
    }
  } catch (error) {
    console.warn("Failed to parse audio metadata, using default duration:", error);
  }
  
  const audioBlob = new Blob([audioBuffer as BlobPart], { type: "audio/mp3" });
  const audioFile = new File([audioBlob], `tts-${Date.now()}.mp3`, {
    type: "audio/mp3",
  });

  // Create media asset record in database
  console.log("Creating media asset in database...");
  const assetId = await fetchMutation(api.mediaAssets.create, {
    projectId,
    mediaType: "audio",
    name: `TTS: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`,
    duration,
    width: 0,
    height: 0,
  });
  console.log("Media asset created with ID:", assetId);

  // Generate upload URL and upload the audio file
  console.log("Generating upload URL...");
  const uploadUrl = await fetchMutation(api.mediaAssets.generateUploadUrl);
  console.log("Upload URL generated");

  // Upload using fetch API
  try {
    // Update progress to indicate upload is starting
    await fetchMutation(api.mediaAssets.update, {
      assetId,
      uploadProgress: 0,
      uploadStatus: "uploading",
    });

    console.log("Uploading audio file...");
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: audioFile,
    });
    console.log("Upload response status:", response.status);

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const result = await response.json();
    const storageId = result.storageId;

    // Update progress to 100% and mark as processing
    await fetchMutation(api.mediaAssets.update, {
      assetId,
      uploadProgress: 100,
      uploadStatus: "processing",
    });

    // Complete the upload
    await fetchAction(api.fileStorage.completeUpload, {
      storageId,
      assetId,
    });
  } catch (error) {
    // Update status to failed on error
    await fetchMutation(api.mediaAssets.update, {
      assetId,
      uploadStatus: "failed",
    });
    throw error;
  }

  return `Audio media asset created with ID: ${assetId}`;
}

main()
  .catch(console.error)
  .finally(() => {
    process.exit(0);
  });
