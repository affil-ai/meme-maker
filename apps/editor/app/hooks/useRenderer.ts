import { useState, useCallback } from "react";
import axios from "axios";
import {
  type TimelineDataItem,
  type TimelineState,
  FPS,
} from "@meme-maker/video-compositions";
import { getRenderApiUrl, RENDER_API_ENDPOINTS } from "~/config/api";

export const useRenderer = () => {
  const [isRendering, setIsRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string>("");

  const handleRenderVideo = useCallback(
    async (
      getTimelineData: () => TimelineDataItem[],
      timeline: TimelineState,
      compositionWidth: number | null,
      compositionHeight: number | null
    ) => {
      setIsRendering(true);
      setRenderStatus("Starting render...");
      
      const renderApiUrl = getRenderApiUrl();
      const renderEndpoint = `${renderApiUrl}${RENDER_API_ENDPOINTS.render}`;
      console.log("Render server URL:", renderEndpoint);

      try {

        const timelineData = getTimelineData();
        // Calculate composition width if not provided
        if (compositionWidth === null) {
          let maxWidth = 0;
          for (const item of timelineData) {
            for (const scrubber of item.scrubbers) {
              if (
                scrubber.media_width !== null &&
                scrubber.media_width > maxWidth
              ) {
                maxWidth = scrubber.media_width;
              }
            }
          }
          compositionWidth = maxWidth || 1920; // Default to 1920 if no media found
        }

        // Calculate composition height if not provided
        if (compositionHeight === null) {
          let maxHeight = 0;
          for (const item of timelineData) {
            for (const scrubber of item.scrubbers) {
              if (
                scrubber.media_height !== null &&
                scrubber.media_height > maxHeight
              ) {
                maxHeight = scrubber.media_height;
              }
            }
          }
          compositionHeight = maxHeight || 1080; // Default to 1080 if no media found
        }

        console.log("Composition width:", compositionWidth);
        console.log("Composition height:", compositionHeight);

        if (
          timeline.tracks.length === 0 ||
          timeline.tracks.every((t) => t.scrubbers.length === 0)
        ) {
          setRenderStatus("Error: No timeline data to render");
          setIsRendering(false);
          return;
        }

        setRenderStatus("Rendering video...");

        const response = await axios.post(
          renderEndpoint,
          {
            timelineData: timelineData,
            compositionWidth: compositionWidth,
            compositionHeight: compositionHeight,
            durationInFrames: (() => {
              const timelineData = getTimelineData();
              let maxEndTime = 0;

              timelineData.forEach((timelineItem) => {
                timelineItem.scrubbers.forEach((scrubber) => {
                  if (scrubber.endTime > maxEndTime) {
                    maxEndTime = scrubber.endTime;
                  }
                });
              });
              console.log("Max end time:", maxEndTime * 30);
              return Math.ceil(maxEndTime * FPS);
            })(),
          },
          {
            timeout: 900000,
          }
        );

        // Check if we got a successful response with download URL
        if (!response.data.downloadUrl) {
          throw new Error("No download URL received from render service");
        }

        // Download the video from S3
        setRenderStatus("Downloading rendered video from S3...");
        
        try {
          // Fetch the video from S3
          const videoResponse = await axios.get(response.data.downloadUrl, {
            responseType: 'blob',
            onDownloadProgress: (progressEvent) => {
              if (progressEvent.lengthComputable && progressEvent.total) {
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                setRenderStatus(
                  `Downloading video: ${percentCompleted}%`
                );
              }
            },
          });

          // Create blob URL and trigger download
          const blob = new Blob([videoResponse.data], { type: 'video/mp4' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", response.data.outputFile || "rendered-video.mp4");
          document.body.appendChild(link);
          link.click();
          link.remove();
          
          // Clean up the blob URL
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
          
          setRenderStatus("Video rendered and downloaded successfully!");
        } catch (downloadError) {
          console.error("Download error:", downloadError);
          // Fallback: open S3 URL in new tab
          setRenderStatus("Opening video in new tab...");
          window.open(response.data.downloadUrl, '_blank');
          setRenderStatus("Video rendered successfully! Check your new tab to download.");
        }
      } catch (error) {
        console.error("Render error:", error);
        if (axios.isAxiosError(error)) {
          if (error.code === "ECONNABORTED") {
            setRenderStatus("Error: Render timeout - try a shorter video");
          } else if (error.response?.status === 500) {
            setRenderStatus(
              `Error: ${
                error.response.data?.message || "Server error during rendering"
              }`
            );
          } else if (error.request) {
            setRenderStatus(
              "Error: Cannot connect to render service. Please refresh and try again.",
            );
          } else {
            setRenderStatus(`Error: ${error.message}`);
          }
        } else {
          setRenderStatus("Error: Unknown rendering error occurred");
        }
      } finally {
        setIsRendering(false);
        setTimeout(() => setRenderStatus(""), 8000); // Show error longer
      }
    },
    []
  );

  return {
    isRendering,
    renderStatus,
    handleRenderVideo,
  };
};
