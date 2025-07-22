import React, { createContext, useContext, useState } from "react";

type CommunityContextType = {
  upvotedImages: Set<number>;
  toggleUpvote: (imageId: number) => void;
  cache: Record<number, any>;
  setCache: (id: number, data: any) => void;
};

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [upvotedImages, setUpvotedImages] = useState<Set<number>>(new Set());
  const [imageCache, setImageCache] = useState<Record<number, any>>({});

  const toggleUpvote = (imageId: number) => {
    setUpvotedImages(prev => {
      const updated = new Set(prev);
      if (updated.has(imageId)) {
        updated.delete(imageId);
      } else {
        updated.add(imageId);
      }
      return updated;
    });
  };

  const setCache = (id: number, data: any) => {
    setImageCache(prev => ({ ...prev, [id]: data }));
  };

  return (
    <CommunityContext.Provider
      value={{
        upvotedImages,
        toggleUpvote,
        cache: imageCache,
        setCache,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = (): CommunityContextType => {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error("useCommunity must be used within a CommunityProvider");
  }
  return context;
};