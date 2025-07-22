import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCreditBalance } from '../api/creditApi';

interface CreditsContextType {
  credits: number | null;
  fetchCredits: () => Promise<void>;
  setCredits: React.Dispatch<React.SetStateAction<number | null>>;
}

const CreditsContext = createContext<CreditsContextType | null>(null);

export const useCredits = () => {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error('useCredits must be used within a CreditsProvider');
  }
  return context;
};

export const CreditsProvider = ({ children }: { children: React.ReactNode }) => {
  const [credits, setCredits] = useState<number | null>(null);

  const fetchCredits = async () => {
    try {
      const response = await getCreditBalance();
      setCredits(response.data.credits);
    } catch (error) {
      console.error('Error fetching credits:', error);
      setCredits(0); // Optional fallback if request fails
    }
  };

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      fetchCredits();
    }
  }, []);

  return (
    <CreditsContext.Provider value={{ credits, fetchCredits, setCredits }}>
      {children}
    </CreditsContext.Provider>
  );
};