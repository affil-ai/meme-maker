import { anthropic } from '@ai-sdk/anthropic';
import {
  type InferUITools,
  type UIDataTypes,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
  streamText,
} from 'ai';
import { tools } from '~/ai/tools';
import { z } from 'zod';

const messageMetadata = z.object({
  projectId: z.string().nullable(),
});

type MessageMetadata = z.infer<typeof messageMetadata>;

export type ChatTools = InferUITools<typeof tools>;

export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const { messages }: { messages: ChatMessage[] } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are a helpful TikTok video editor assistant. You are working on a project with the ID ${projectId}. The dimensions of the video are 1080x1920.`,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(2),
    tools,
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: (): MessageMetadata => {
      return {
        projectId,
      }
    },
  });
}