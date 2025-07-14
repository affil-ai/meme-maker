"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  // Determine active tab based on current route
  const getActiveTab = () => {
    if (pathname.includes("/media-bin")) return "media-bin";
    if (pathname.includes("/text-editor")) return "text-editor";
    return "media-bin"; // default
  };

  const activeTab = getActiveTab();

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs value={activeTab} className="h-full flex flex-col">
        {/* Tab Headers */}
        <div className="border-b border-border bg-muted/30">
          <TabsList className="grid w-full grid-cols-2 h-9 bg-transparent p-0">
            <TabsTrigger
              value="media-bin"
              asChild
              className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Link href="/media-bin" className="flex items-center gap-1.5">
                <FileImage className="h-3 w-3" />
                Media
              </Link>
            </TabsTrigger>
            <TabsTrigger
              value="text-editor"
              asChild
              className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Link href="/text-editor" className="flex items-center gap-1.5">
                <Type className="h-3 w-3" />
                Text
              </Link>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "media-bin" && (
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
          )}
          {activeTab === "text-editor" && (
            <TextEditor
              onAddText={onAddText}
            />
          )}
        </div>
      </Tabs>
    </div>
  );
}
