import React, { createContext, ReactNode, useState } from 'react';

const GlobalContext = createContext<any>(undefined);

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [generatData, setGeneratData] = useState(null);
  const [canvasImportImages, setCanvasImportImages] = useState<string[]>([]);

  return (
    <GlobalContext.Provider value={{
      generatData,
      setGeneratData,
      canvasImportImages,
      setCanvasImportImages,
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = React.useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};
