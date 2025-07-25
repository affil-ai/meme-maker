import React, { useRef, useEffect, useCallback, useState } from "react";
import type { PlayerRef, CallbackListener } from "@remotion/player";
import {
  Moon,
  Sun,
  Play,
  Pause,
  Upload,
  Download,
  Settings,
  Plus,
  Minus,
  Scissors,
  FolderOpen,
  Undo2,
  Redo2,
} from "lucide-react";
import { useProject } from "~/contexts/ProjectContext";

// Custom video controls
import { MuteButton, FullscreenButton } from "~/components/ui/video-controls";
import { useTheme } from "next-themes";

// Components
import LeftPanel from "~/components/editor/LeftPanel";
import RightPanel from "~/components/editor/RightPanel";
import { RenderStatus } from "~/components/timeline/RenderStatus";
import { TimelineRuler } from "~/components/timeline/TimelineRuler";
import { TimelineTracks } from "~/components/timeline/TimelineTracks";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "~/components/ui/resizable";
import { toast } from "sonner";

// Hooks
import { useTimeline } from "~/hooks/useTimeline";
import { useMediaBin } from "~/hooks/useMediaBin";
import { useRuler } from "~/hooks/useRuler";
import { useRenderer } from "~/hooks/useRenderer";
import { useUndoRedo } from "~/hooks/useUndoRedo";

// Types and constants
import { VideoPlayer, FPS, type ScrubberState } from "@meme-maker/video-compositions";
import { useRouter } from "next/navigation";


export default function TimelineEditor() {
  // Project context
  const { project, setProjectId } = useProject();
  const router = useRouter();

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme
  const { theme, setTheme } = useTheme();

  // State for video dimensions
  const [width, setWidth] = useState<number>(1080);
  const [height, setHeight] = useState<number>(1920);
  const [isAutoSize, setIsAutoSize] = useState<boolean>(false);


  // Unified selection state - single source of truth
  const [selectedScrubberId, setSelectedScrubberId] = useState<string | null>(null);

  // Alias for canvas selection to maintain compatibility
  const selectedItem = selectedScrubberId;
  const setSelectedItem = setSelectedScrubberId;

  // Custom hooks
  const {
    timeline,
    timelineWidth,
    zoomLevel,
    getPixelsPerSecond,
    getTimelineData,
    expandTimeline,
    handleAddTrack,
    handleDeleteTrack,
    getAllScrubbers,
    handleUpdateScrubber,
    handleDeleteScrubber,
    handleDeleteScrubbersByMediaBinId,
    handleDropOnTrack,
    handleDropOnNewTrack,
    handleSplitScrubberAtRuler,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  } = useTimeline();

  const { 
    mediaBinItems, 
    handleAddMediaToBin, 
    handleAddTextToBin, 
    contextMenu, 
    handleContextMenu, 
    handleDeleteFromContext, 
    handleSplitAudioFromContext, 
    handleCloseContextMenu 
  } = useMediaBin(handleDeleteScrubbersByMediaBinId);

  const {
    rulerPositionPx,
    isDraggingRuler,
    handleRulerDrag,
    handleRulerMouseDown,
    handleRulerMouseMove,
    handleRulerMouseUp,
    handleScroll,
    updateRulerFromPlayer,
  } = useRuler(playerRef, timelineWidth, getPixelsPerSecond());

  const { isRendering, renderStatus, handleRenderVideo } = useRenderer();
  
  const { canUndo, canRedo, handleUndo, handleRedo } = useUndoRedo();

  // Derived values
  const timelineData = getTimelineData();

  // Handle partial scrubber updates
  const handlePartialUpdateScrubber = useCallback((id: string, updates: Partial<ScrubberState>) => {
    const scrubber = getAllScrubbers().find(s => s.id === id);
    if (scrubber) {
      handleUpdateScrubber({ ...scrubber, ...updates });
    }
  }, [getAllScrubbers, handleUpdateScrubber]);
  const durationInFrames = (() => {
    let maxEndTime = 0;
    timelineData.forEach((timelineItem) => {
      timelineItem.scrubbers.forEach((scrubber) => {
        if (scrubber.endTime > maxEndTime) maxEndTime = scrubber.endTime;
      });
    });
    return Math.ceil(maxEndTime * FPS);
  })();

  // Event handlers with toast notifications
  const handleAddMediaClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        let successCount = 0;
        let errorCount = 0;

        // Process files sequentially to avoid overwhelming the system
        for (const file of fileArray) {
          try {
            await handleAddMediaToBin(file);
            successCount++;
          } catch (error) {
            errorCount++;
            console.error(`Failed to add ${file.name}:`, error);
          }
        }

        if (successCount > 0 && errorCount > 0) {
          toast.warning(`Imported ${successCount} file${successCount > 1 ? 's' : ''}, ${errorCount} failed`);
        } else if (errorCount > 0) {
          toast.error(`Failed to import ${errorCount} file${errorCount > 1 ? 's' : ''}`);
        }

        e.target.value = "";
      }
    },
    [handleAddMediaToBin]
  );

  const handleRenderClick = useCallback(() => {
    if (
      timelineData.length === 0 ||
      timelineData.every((item) => item.scrubbers.length === 0)
    ) {
      toast.error("No timeline to render. Add some media first!");
      return;
    }

    handleRenderVideo(
      getTimelineData,
      timeline,
      isAutoSize ? null : width,
      isAutoSize ? null : height
    );
    toast.info("Starting render...");
  }, [
    handleRenderVideo,
    getTimelineData,
    timeline,
    width,
    height,
    isAutoSize,
    timelineData,
  ]);

  const handleLogTimelineData = useCallback(() => {
    if (timelineData.length === 0) {
      toast.error("Timeline is empty");
      return;
    }
    
    // Transform the timeline data to use consistent coordinate naming
    const transformedData = getTimelineData().map(track => ({
      ...track,
      scrubbers: track.scrubbers.map(scrubber => {
        const { left_player, top_player, width_player, height_player, ...rest } = scrubber;
        return {
          ...rest,
          // Rename player coordinates to match keyframe property names
          position: {
            x: left_player,
            y: top_player
          },
          size: {
            width: width_player,
            height: height_player
          }
        };
      })
    }));
    
    const timelineDataWithDimensions = {
      timeline: transformedData,
      videoDimensions: {
        width,
        height,
      }
    };
    const dataString = JSON.stringify(timelineDataWithDimensions, null, 2);
    console.log(dataString);
    window.navigator.clipboard.writeText(dataString);
    toast.success("Timeline data logged to console and copied to clipboard");
  }, [getTimelineData, timelineData, width, height]);

  const handleWidthChange = useCallback((newWidth: number) => {
    setWidth(newWidth);
  }, []);

  const handleHeightChange = useCallback((newHeight: number) => {
    setHeight(newHeight);
  }, []);

  const handleAutoSizeChange = useCallback((auto: boolean) => {
    setIsAutoSize(auto);
  }, []);

  const handleAddTrackClick = useCallback(() => {
    handleAddTrack();
  }, [handleAddTrack]);

  const handleSplitClick = useCallback(async () => {
    if (!selectedScrubberId) {
      toast.error("Please select a scrubber to split first!");
      return;
    }

    if (timelineData.length === 0 ||
      timelineData.every((item) => item.scrubbers.length === 0)) {
      toast.error("No scrubbers to split. Add some media first!");
      return;
    }

    const splitCount = await handleSplitScrubberAtRuler(rulerPositionPx, selectedScrubberId);
    if (splitCount === 0) {
      toast.info("Cannot split: ruler is not positioned within the selected scrubber");
    } else {
      setSelectedScrubberId(null); // Clear selection since original scrubber is replaced
      toast.success(`Split the selected scrubber at ruler position`);
    }
  }, [handleSplitScrubberAtRuler, rulerPositionPx, selectedScrubberId, timelineData]);

  const expandTimelineCallback = useCallback(() => {
    return expandTimeline(containerRef);
  }, [expandTimeline]);

  const handleScrollCallback = useCallback(() => {
    handleScroll(containerRef, expandTimelineCallback);
  }, [handleScroll, expandTimelineCallback]);

  // Play/pause controls with Player sync
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayback = useCallback(() => {
    const player = playerRef.current;
    if (player) {
      if (player.isPlaying()) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    }
  }, []);

  // Sync player state with controls - simplified like original
  useEffect(() => {
    const player = playerRef.current;
    if (player) {
      const handlePlay: CallbackListener<"play"> = () => setIsPlaying(true);
      const handlePause: CallbackListener<"pause"> = () => setIsPlaying(false);
      const handleFrameUpdate: CallbackListener<"frameupdate"> = (e) => {
        // Update ruler position from player
        updateRulerFromPlayer(e.detail.frame);
      };

      player.addEventListener("play", handlePlay);
      player.addEventListener("pause", handlePause);
      player.addEventListener("frameupdate", handleFrameUpdate);

      return () => {
        player.removeEventListener("play", handlePlay);
        player.removeEventListener("pause", handlePause);
        player.removeEventListener("frameupdate", handleFrameUpdate);
      };
    }
  }, [updateRulerFromPlayer]);

  // Global spacebar play/pause functionality - like original
  useEffect(() => {
    const handleGlobalKeyPress = (event: KeyboardEvent) => {
      // Only handle spacebar when not focused on input elements
      if (event.code === "Space") {
        const target = event.target as HTMLElement;
        const isInputElement =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.contentEditable === "true" ||
          target.isContentEditable;

        // If user is typing in an input field, don't interfere
        if (isInputElement) {
          return;
        }

        // Prevent spacebar from scrolling the page
        event.preventDefault();

        const player = playerRef.current;
        if (player) {
          if (player.isPlaying()) {
            player.pause();
          } else {
            player.play();
          }
        }
      }
    };

    // Add event listener to document for global capture
    document.addEventListener("keydown", handleGlobalKeyPress);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyPress);
    };
  }, []); // Empty dependency array since we're accessing playerRef.current directly

  // Ruler mouse events
  useEffect(() => {
    if (isDraggingRuler) {
      const handleMouseMove = (e: MouseEvent) =>
        handleRulerMouseMove(e, containerRef);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleRulerMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleRulerMouseUp);
      };
    }
  }, [isDraggingRuler, handleRulerMouseMove, handleRulerMouseUp]);

  // Timeline wheel zoom functionality
  useEffect(() => {
    const timelineContainer = containerRef.current;
    if (!timelineContainer) return;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom if Ctrl or Cmd is held
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const scrollDirection = e.deltaY > 0 ? -1 : 1;

        if (scrollDirection > 0) {
          handleZoomIn();
        } else {
          handleZoomOut();
        }
      }
    };

    timelineContainer.addEventListener("wheel", handleWheel, {
      passive: false,
    });
    return () => {
      timelineContainer.removeEventListener("wheel", handleWheel);
    };
  }, [handleZoomIn, handleZoomOut]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Ultra-minimal Top Bar */}
      <header className="h-9 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium tracking-tight">VideoEditor</h1>
          {project && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="h-7 px-2 text-xs gap-1"
              >
                <FolderOpen className="h-3 w-3" />
                {project.name}
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-7 w-7 p-0 hover:bg-muted"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </Button>

          <Separator orientation="vertical" className="h-4 mx-1" />

          {/* Import/Export */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddMediaClick}
            className="h-7 px-2 text-xs"
          >
            <Upload className="h-3 w-3 mr-1" />
            Import
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleRenderClick}
            disabled={isRendering}
            className="h-7 px-2 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            {isRendering ? "Rendering..." : "Export"}
          </Button>
        </div>
      </header>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Media Bin & Tools */}
        <ResizablePanel defaultSize={20} minSize={0} maxSize={35}>
          <div className="h-full border-r border-border">
            <LeftPanel
              mediaBinItems={mediaBinItems}
              onAddMedia={handleAddMediaToBin}
              onAddText={handleAddTextToBin}
              contextMenu={contextMenu}
              handleContextMenu={handleContextMenu}
              handleDeleteFromContext={handleDeleteFromContext}
              handleSplitAudioFromContext={handleSplitAudioFromContext}
              handleCloseContextMenu={handleCloseContextMenu}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Content Area */}
        <ResizablePanel defaultSize={60}>
          <ResizablePanelGroup direction="vertical">
            {/* Preview Area */}
            <ResizablePanel defaultSize={65} minSize={40}>
              <div className="h-full flex flex-col bg-background">
                {/* Compact Top Bar */}
                <div className="h-8 border-b border-border/50 bg-muted/30 flex items-center justify-between px-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Resolution:</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={width}
                        onChange={(e) =>
                          handleWidthChange(Number(e.target.value))
                        }
                        disabled={isAutoSize}
                        className="h-5 w-14 text-xs px-1 border-0 bg-muted/50"
                      />
                      <span>×</span>
                      <Input
                        type="number"
                        value={height}
                        onChange={(e) =>
                          handleHeightChange(Number(e.target.value))
                        }
                        disabled={isAutoSize}
                        className="h-5 w-14 text-xs px-1 border-0 bg-muted/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1">
                      <Switch
                        id="auto-size"
                        checked={isAutoSize}
                        onCheckedChange={handleAutoSizeChange}
                        className="scale-75"
                      />
                      <Label htmlFor="auto-size" className="text-xs">
                        Auto
                      </Label>
                    </div>

                  </div>
                </div>

                {/* Video Preview */}
                <div
                  className={`flex-1 ${theme === "dark" ? "bg-zinc-900" : "bg-zinc-200/70"
                    } flex flex-col items-center justify-center p-3 border border-border/50 rounded-lg overflow-hidden shadow-2xl relative`}
                >
                  <div
                    className="flex-1 flex items-center justify-center w-full">
                    <VideoPlayer
                      timelineData={timelineData}
                      durationInFrames={durationInFrames}
                      ref={playerRef}
                      compositionWidth={isAutoSize ? null : width}
                      compositionHeight={isAutoSize ? null : height}
                      timeline={timeline}
                      handleUpdateScrubber={handleUpdateScrubber}
                      selectedItem={selectedItem}
                      setSelectedItem={setSelectedItem}
                    />
                  </div>

                  {/* Custom Video Controls - Below Player */}
                  <div className="w-full flex items-center justify-center gap-2 mt-3 px-4">
                    {/* Left side controls */}
                    <div className="flex items-center gap-1">
                      <MuteButton playerRef={playerRef} />
                    </div>

                    {/* Center play/pause button */}
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={togglePlayback}
                        className="h-6 w-6 p-0"
                      >
                        {isPlaying ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    {/* Right side controls */}
                    <div className="flex items-center gap-1">
                      <FullscreenButton playerRef={playerRef} />
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Timeline Area */}
            <ResizablePanel defaultSize={40} minSize={25}>
              <div className="h-full flex flex-col bg-muted/20">
                {/* Compact Timeline Header */}
                <div className="h-8 border-b border-border/50 bg-muted/30 flex items-center justify-between px-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Timeline</span>
                    <Badge
                      variant="outline"
                      className="text-xs h-4 px-1.5 font-mono"
                    >
                      {Math.round(((durationInFrames || 0) / FPS) * 10) / 10}s
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleUndo}
                      disabled={!canUndo}
                      className="h-6 px-2 text-xs"
                      title="Undo (Cmd/Ctrl+Z)"
                    >
                      <Undo2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRedo}
                      disabled={!canRedo}
                      className="h-6 px-2 text-xs"
                      title="Redo (Cmd/Ctrl+Y)"
                    >
                      <Redo2 className="h-3 w-3" />
                    </Button>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomOut}
                        className="h-6 w-6 p-0 text-xs"
                        title="Zoom Out"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Badge
                        variant="secondary"
                        className="text-xs h-4 px-1.5 font-mono cursor-pointer hover:bg-secondary/80 transition-colors"
                        onClick={handleZoomReset}
                        title="Click to reset zoom to 100%"
                      >
                        {Math.round(zoomLevel * 100)}%
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomIn}
                        className="h-6 w-6 p-0 text-xs"
                        title="Zoom In"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddTrackClick}
                      className="h-6 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Track
                    </Button>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSplitClick}
                      className="h-6 px-2 text-xs"
                      title="Split selected scrubber at ruler position"
                    >
                      <Scissors className="h-3 w-3 mr-1" />
                      Split
                    </Button>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogTimelineData}
                      className="h-6 px-2 text-xs"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Debug
                    </Button>
                  </div>
                </div>

                {/* Timeline Ruler - Ultra compact */}
                <TimelineRuler
                  timelineWidth={timelineWidth}
                  rulerPositionPx={rulerPositionPx}
                  containerRef={containerRef}
                  onRulerDrag={handleRulerDrag}
                  onRulerMouseDown={handleRulerMouseDown}
                  pixelsPerSecond={getPixelsPerSecond()}
                />

                {/* Timeline Content */}
                <TimelineTracks
                  timeline={timeline}
                  timelineWidth={timelineWidth}
                  rulerPositionPx={rulerPositionPx}
                  containerRef={containerRef}
                  onScroll={handleScrollCallback}
                  onDeleteTrack={handleDeleteTrack}
                  onUpdateScrubber={handleUpdateScrubber}
                  onDeleteScrubber={handleDeleteScrubber}
                  onDropOnTrack={handleDropOnTrack}
                  onDropOnNewTrack={handleDropOnNewTrack}
                  onAddTrack={handleAddTrack}
                  getAllScrubbers={getAllScrubbers}
                  expandTimeline={expandTimelineCallback}
                  onRulerMouseDown={handleRulerMouseDown}
                  pixelsPerSecond={getPixelsPerSecond()}
                  selectedScrubberId={selectedScrubberId}
                  onSelectScrubber={setSelectedScrubberId}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Properties */}
        <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
          <div className="h-full border-l border-border" data-panel-id="right-panel">
            <RightPanel
              selectedScrubber={selectedScrubberId ? getAllScrubbers().find(s => s.id === selectedScrubberId) || null : null}
              onUpdateScrubber={handlePartialUpdateScrubber}
            />
          </div>
        </ResizablePanel>

      </ResizablePanelGroup>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Render Status as Toast */}
      {renderStatus && (
        <div className="fixed bottom-4 right-4 z-50">
          <RenderStatus renderStatus={renderStatus} />
        </div>
      )}
    </div>
  );
}