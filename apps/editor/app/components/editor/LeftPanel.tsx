"use client";

import React, { useState } from "react";
import { FileImage, Type } from "lucide-react";
import { type MediaBinItem } from "@meme-maker/video-compositions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import MediaBin from "~/components/timeline/MediaBin";
import TextEditor from "~/components/media/TextEditor";

interface LeftPanelProps {
  mediaBinItems: MediaBinItem[];
  onAddMedia: (file: File) => Promise<void>;
  onAddText: (
    textContent: string,
    fontSize: number,
    fontFamily: string,
    color: string,
    textAlign: "left" | "center" | "right",
    fontWeight: "normal" | "bold"
  ) => void;
  contextMenu: {
    x: number;
    y: number;
    item: MediaBinItem;
  } | null;
  handleContextMenu: (e: React.MouseEvent, item: MediaBinItem) => void;
  handleDeleteFromContext: () => Promise<void>;
  handleSplitAudioFromContext: () => Promise<void>;
  handleCloseContextMenu: () => void;
}

export default function LeftPanel({
  mediaBinItems,
  onAddMedia,
  onAddText,
  contextMenu,
  handleContextMenu,
  handleDeleteFromContext,
  handleSplitAudioFromContext,
  handleCloseContextMenu,
}: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<"media-bin" | "text-editor">("media-bin");

  const handleAddText = (
    textContent: string,
    fontSize: number,
    fontFamily: string,
    color: string,
    textAlign: "left" | "center" | "right",
    fontWeight: "normal" | "bold"
  ) => {
    onAddText(textContent, fontSize, fontFamily, color, textAlign, fontWeight);
    // Switch back to media-bin tab after adding text
    setActiveTab("media-bin");
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "media-bin" | "text-editor")} className="h-full flex flex-col">
        {/* Tab Headers */}
        <div className="border-b border-border bg-muted/30">
          <TabsList className="grid w-full grid-cols-2 h-9 bg-transparent p-0">
            <TabsTrigger
              value="media-bin"
              className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-1.5"
            >
              <FileImage className="h-3 w-3" />
              Media
            </TabsTrigger>
            <TabsTrigger
              value="text-editor"
              className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-1.5"
            >
              <Type className="h-3 w-3" />
              Text
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="media-bin" className="h-full m-0">
            <MediaBin
              mediaBinItems={mediaBinItems}
              onAddMedia={onAddMedia}
              onAddText={onAddText}
              contextMenu={contextMenu}
              handleContextMenu={handleContextMenu}
              handleDeleteFromContext={handleDeleteFromContext}
              handleSplitAudioFromContext={handleSplitAudioFromContext}
              handleCloseContextMenu={handleCloseContextMenu}
            />
          </TabsContent>
          <TabsContent value="text-editor" className="h-full m-0">
            <TextEditor
              onAddText={handleAddText}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
