import { useCallback } from "react"
import { useMediaBinStore } from "~/stores/useMediaBinStore"
import { apiUrl } from "~/utils/api"

export const deleteMediaFile = async (filename: string): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const response = await fetch(apiUrl(`/media/${encodeURIComponent(filename)}`), {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete file');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Delete API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const cloneMediaFile = async (filename: string, originalName: string, suffix: string): Promise<{ success: boolean; filename?: string; originalName?: string; url?: string; fullUrl?: string; size?: number; error?: string }> => {
  try {
    const response = await fetch(apiUrl('/clone-media'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        originalName,
        suffix
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to clone file');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Clone API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const useMediaBin = (handleDeleteScrubbersByMediaBinId: (mediaBinId: string) => void) => {
  const {
    mediaBinItems,
    contextMenu,
    setContextMenu,
    handleAddMediaToBin,
    handleAddTextToBin,
    handleDeleteMedia: storeHandleDeleteMedia,
    handleSplitAudio,
  } = useMediaBinStore()

  const handleDeleteMedia = useCallback(async (item: Parameters<typeof storeHandleDeleteMedia>[0]) => {
    await storeHandleDeleteMedia(item, handleDeleteScrubbersByMediaBinId)
  }, [storeHandleDeleteMedia, handleDeleteScrubbersByMediaBinId])

  const handleContextMenu = useCallback((e: React.MouseEvent, item: import("~/components/timeline/types").MediaBinItem) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
    })
  }, [setContextMenu])

  const handleDeleteFromContext = useCallback(async () => {
    if (!contextMenu) return
    await handleDeleteMedia(contextMenu.item)
    setContextMenu(null)
  }, [contextMenu, handleDeleteMedia, setContextMenu])

  const handleSplitAudioFromContext = useCallback(async () => {
    if (!contextMenu) return
    await handleSplitAudio(contextMenu.item)
  }, [contextMenu, handleSplitAudio])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [setContextMenu])

  return {
    mediaBinItems,
    handleAddMediaToBin,
    handleAddTextToBin,
    handleDeleteMedia,
    handleSplitAudio,
    contextMenu,
    handleContextMenu,
    handleDeleteFromContext,
    handleSplitAudioFromContext,
    handleCloseContextMenu,
  }
}