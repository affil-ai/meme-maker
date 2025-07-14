import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@meme-maker/backend";

interface StorageUrlMap {
  [storageId: string]: string | null;
}

export function useStorageUrls(storageIds: (string | null)[]) {
  const [urls, setUrls] = useState<StorageUrlMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const getFileUrls = useMutation(api.fileStorage.getFileUrls);

  useEffect(() => {
    const fetchUrls = async () => {
      // Filter out null/undefined storage IDs and already resolved ones
      const validStorageIds = storageIds.filter(
        (id): id is string => 
          id !== null && 
          id !== undefined && 
          id !== "" &&
          !urls[id]
      );

      if (validStorageIds.length === 0) {
        return;
      }

      setIsLoading(true);
      try {
        const results = await getFileUrls({ storageIds: validStorageIds });
        
        // Update URLs state
        const newUrls: StorageUrlMap = {};
        results.forEach((result) => {
          newUrls[result.storageId] = result.url;
        });
        
        setUrls((prev) => ({ ...prev, ...newUrls }));
      } catch (error) {
        console.error("Failed to fetch storage URLs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUrls();
  }, [storageIds.join(","), getFileUrls]); // eslint-disable-line react-hooks/exhaustive-deps

  return { urls, isLoading };
}

// Hook to get a single storage URL
export function useStorageUrl(storageId: string | null) {
  const { urls, isLoading } = useStorageUrls(storageId ? [storageId] : []);
  return {
    url: storageId ? urls[storageId] || null : null,
    isLoading
  };
}