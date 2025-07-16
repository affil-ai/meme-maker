import { VideoData } from "@meme-maker/video-compositions";
import { parseVideoDataForAI } from "./utils";

export const describeVideoPrompt = (videoData: VideoData) => `
You will be given json data of a video I am making. I want you to describe what the video is in one simple sentence.
Analyze the timing and positioning of the movements to determine the intended story being told.
Look at how the elements interact with each other in the physical space - consider if one object is meant to be collecting, affecting, or interacting with another based on their movement patterns, rather than just moving independently. 
Describe this as a sequence of events, explaining the cause and effect relationship between the objects' movements and what the final outcome of their interaction is.

The dimensions of the video/physical space are provided as width and height.
The x and y coordinates represent the top-left corner of each element. When analyzing positioning, consider that an element is visible on screen if its top-left corner plus its dimensions fall within the video boundaries (0 to width, 0 to height).
Use these dimensions to accurately determine if elements are on-screen, off-screen, or at the edges of the frame, as this affects how the story should be interpreted.

${parseVideoDataForAI(videoData)}
  `;

export const regularPrompt = "You are a friendly video-editing assistant! Keep your responses concise and helpful";