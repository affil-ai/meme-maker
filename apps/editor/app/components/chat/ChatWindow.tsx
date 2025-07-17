"use client";

import Markdown from "react-markdown";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "~/api/chat/route";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Send, Bot, User, Wrench, MessageSquare } from "lucide-react";
import { cn } from "~/lib/utils";
import { useProject } from "~/contexts/ProjectContext";

export default function ChatWindow() {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const { projectId } = useProject();
  const { messages, sendMessage, status } = useChat<ChatMessage>({
    transport: new DefaultChatTransport({
      api: `/api/chat?projectId=${projectId}`,
    }),
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      // Use setTimeout to ensure DOM has updated with new content
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage({
        text: input.trim(),
      });
      setInput("");
    }
  };

  return (
    <Card className="flex flex-col h-full max-h-[88vh] overflow-hidden w-full mx-auto shadow-lg">
      <CardHeader className="border-b px-6 py-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-5 w-5" />
          AI Assistant
        </CardTitle>
      </CardHeader>

      <CardContent className="w-full flex-1 p-0 mb-0 overflow-hidden">
        <ScrollArea className="size-full px-2" ref={scrollAreaRef}>
          <div className="space-y-4 px-2 py-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-sm">
                  Start a conversation by typing a message below
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3 group",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex flex-col gap-2 max-w-[85%] min-w-0",
                      message.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    {message.parts.map((part, partIndex) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <div
                              key={`${message.id}-text-${partIndex}`}
                              className={cn(
                                "px-4 py-2 rounded-2xl text-sm markdown break-words",
                                message.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-white"
                              )}
                            >
                              <Markdown>{part.text}</Markdown>
                            </div>
                          );
                        case "tool-editClip":
                        case "tool-getTimelineData":
                          return (
                            <div
                              key={`${message.id}-editClip-${partIndex}`}
                              className="bg-accent/50 border border-accent rounded-lg p-3 text-xs font-mono overflow-hidden w-full"
                            >
                              <pre className="overflow-x-auto whitespace-pre-wrap break-words">
                                {JSON.stringify(part, null, 2)}
                              </pre>
                            </div>
                          );
                        default:
                          return null;
                      }
                    })}
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4 text-secondary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 w-full"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send message</TooltipContent>
          </Tooltip>
        </form>
      </CardFooter>
    </Card>
  );
}
