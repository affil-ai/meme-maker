import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import { type MediaBinItem } from '~/components/timeline/types'
import { generateUUID } from '~/utils/uuid'
import { apiUrl } from '~/utils/api'
import { deleteMediaFile, cloneMediaFile } from '~/hooks/useMediaBin'

interface MediaBinStore {
  mediaBinItems: MediaBinItem[]
  contextMenu: {
    x: number
    y: number
    item: MediaBinItem
  } | null

  setMediaBinItems: (items: MediaBinItem[]) => void
  addMediaBinItem: (item: MediaBinItem) => void
  updateMediaBinItem: (id: string, updates: Partial<MediaBinItem>) => void
  removeMediaBinItem: (id: string) => void
  
  setContextMenu: (menu: { x: number; y: number; item: MediaBinItem } | null) => void
  
  handleAddMediaToBin: (file: File) => Promise<void>
  handleAddTextToBin: (
    textContent: string,
    fontSize: number,
    fontFamily: string,
    color: string,
    textAlign: "left" | "center" | "right",
    fontWeight: "normal" | "bold"
  ) => void
  handleDeleteMedia: (item: MediaBinItem, handleDeleteScrubbersByMediaBinId?: (mediaBinId: string) => void) => Promise<void>
  handleSplitAudio: (videoItem: MediaBinItem) => Promise<void>
}

const getMediaMetadata = (file: File, mediaType: "video" | "image" | "audio"): Promise<{
  durationInSeconds?: number
  width: number
  height: number
}> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)

    if (mediaType === "video") {
      const video = document.createElement("video")
      video.preload = "metadata"

      video.onloadedmetadata = () => {
        const width = video.videoWidth
        const height = video.videoHeight
        const durationInSeconds = video.duration

        URL.revokeObjectURL(url)
        resolve({
          durationInSeconds: isFinite(durationInSeconds) ? durationInSeconds : undefined,
          width,
          height
        })
      }

      video.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Failed to load video metadata"))
      }

      video.src = url
    } else if (mediaType === "image") {
      const img = new Image()

      img.onload = () => {
        const width = img.naturalWidth
        const height = img.naturalHeight

        URL.revokeObjectURL(url)
        resolve({
          durationInSeconds: undefined,
          width,
          height
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Failed to load image metadata"))
      }

      img.src = url
    } else if (mediaType === "audio") {
      const audio = document.createElement("audio")
      audio.preload = "metadata"

      audio.onloadedmetadata = () => {
        const durationInSeconds = audio.duration

        URL.revokeObjectURL(url)
        resolve({
          durationInSeconds: isFinite(durationInSeconds) ? durationInSeconds : undefined,
          width: 0,
          height: 0
        })
      }

      audio.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Failed to load audio metadata"))
      }

      audio.src = url
    }
  })
}

export const useMediaBinStore = create<MediaBinStore>()(
  persist(
    (set, get) => ({
      mediaBinItems: [],
      contextMenu: null,

      setMediaBinItems: (items) => set({ mediaBinItems: items }),
      
      addMediaBinItem: (item) => set((state) => ({
        mediaBinItems: [...state.mediaBinItems, item]
      })),
      
      updateMediaBinItem: (id, updates) => set((state) => ({
        mediaBinItems: state.mediaBinItems.map(item =>
          item.id === id ? { ...item, ...updates } : item
        )
      })),
      
      removeMediaBinItem: (id) => set((state) => ({
        mediaBinItems: state.mediaBinItems.filter(item => item.id !== id)
      })),

      setContextMenu: (menu) => set({ contextMenu: menu }),

      handleAddMediaToBin: async (file) => {
        const id = generateUUID()
        const name = file.name
        let mediaType: "video" | "image" | "audio"
        if (file.type.startsWith("video/")) mediaType = "video"
        else if (file.type.startsWith("image/")) mediaType = "image"
        else if (file.type.startsWith("audio/")) mediaType = "audio"
        else {
          alert("Unsupported file type. Please select a video or image.")
          return
        }

        console.log("Adding to bin:", name, mediaType)

        try {
          const mediaUrlLocal = URL.createObjectURL(file)

          console.log(`Parsing ${mediaType} file for metadata...`)
          const metadata = await getMediaMetadata(file, mediaType)
          console.log("Media metadata:", metadata)

          const newItem: MediaBinItem = {
            id,
            name,
            mediaType,
            mediaUrlLocal,
            mediaUrlRemote: null,
            durationInSeconds: metadata.durationInSeconds ?? 0,
            media_width: metadata.width,
            media_height: metadata.height,
            text: null,
            isUploading: true,
            uploadProgress: 0,
          }
          get().addMediaBinItem(newItem)

          const formData = new FormData()
          formData.append('media', file)

          console.log("Uploading file to server...")
          const uploadResponse = await axios.post(apiUrl('/upload'), formData, {
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                console.log(`Upload progress: ${percentCompleted}%`)
                get().updateMediaBinItem(id, { uploadProgress: percentCompleted })
              }
            }
          })

          const uploadResult = uploadResponse.data
          console.log("Upload successful:", uploadResult)

          get().updateMediaBinItem(id, {
            mediaUrlRemote: uploadResult.fullUrl,
            isUploading: false,
            uploadProgress: null
          })

        } catch (error) {
          console.error("Error adding media to bin:", error)
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          get().removeMediaBinItem(id)
          throw new Error(`Failed to add media: ${errorMessage}`)
        }
      },

      handleAddTextToBin: (textContent, fontSize, fontFamily, color, textAlign, fontWeight) => {
        const newItem: MediaBinItem = {
          id: generateUUID(),
          name: textContent,
          mediaType: "text",
          media_width: 0,
          media_height: 0,
          text: {
            textContent,
            fontSize,
            fontFamily,
            color,
            textAlign,
            fontWeight,
          },
          mediaUrlLocal: null,
          mediaUrlRemote: null,
          durationInSeconds: 0,
          isUploading: false,
          uploadProgress: null,
        }
        get().addMediaBinItem(newItem)
      },

      handleDeleteMedia: async (item, handleDeleteScrubbersByMediaBinId) => {
        try {
          if (!item.mediaUrlRemote) {
            console.error('No remote URL found for media item')
            return
          }

          const url = new URL(item.mediaUrlRemote)
          const pathSegments = url.pathname.split('/')
          const encodedFilename = pathSegments[pathSegments.length - 1]
          
          if (!encodedFilename) {
            console.error('Could not extract filename from URL:', item.mediaUrlRemote)
            return
          }

          const filename = decodeURIComponent(encodedFilename)
          console.log('Extracted filename:', filename)

          const result = await deleteMediaFile(filename)
          if (result.success) {
            console.log(`Media deleted: ${item.name}`)
            get().removeMediaBinItem(item.id)
            if (handleDeleteScrubbersByMediaBinId) {
              handleDeleteScrubbersByMediaBinId(item.id)
            }
          } else {
            console.error('Failed to delete media:', result.error)
          }
        } catch (error) {
          console.error('Error deleting media:', error)
        }
      },

      handleSplitAudio: async (videoItem) => {
        if (videoItem.mediaType !== 'video') {
          throw new Error('Can only split audio from video files')
        }

        try {
          if (!videoItem.mediaUrlRemote) {
            throw new Error('No remote URL found for video item')
          }

          const url = new URL(videoItem.mediaUrlRemote)
          const pathSegments = url.pathname.split('/')
          const encodedFilename = pathSegments[pathSegments.length - 1]
          
          if (!encodedFilename) {
            throw new Error('Could not extract filename from URL')
          }

          const cloneResult = await cloneMediaFile(encodedFilename, videoItem.name, '(Audio)')
          
          if (!cloneResult.success) {
            throw new Error(cloneResult.error || 'Failed to clone media file')
          }

          const audioItem: MediaBinItem = {
            id: generateUUID(),
            name: `${videoItem.name} (Audio)`,
            mediaType: "audio",
            mediaUrlLocal: videoItem.mediaUrlLocal,
            mediaUrlRemote: cloneResult.fullUrl!,
            durationInSeconds: videoItem.durationInSeconds,
            media_width: 0,
            media_height: 0,
            text: null,
            isUploading: false,
            uploadProgress: null,
          }

          get().addMediaBinItem(audioItem)
          set({ contextMenu: null })
          
          console.log(`Audio split successful: ${videoItem.name} -> ${audioItem.name}`)
        } catch (error) {
          console.error('Error splitting audio:', error)
          throw error
        }
      },
    }),
    {
      name: 'mediabin-storage',
      partialize: (state) => ({
        mediaBinItems: state.mediaBinItems.filter(item => !item.isUploading),
      }),
    }
  )
)