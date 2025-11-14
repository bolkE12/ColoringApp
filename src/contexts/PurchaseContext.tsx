import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ DEBUG: Set to true to force free tier for testing (ignores AsyncStorage)
const FORCE_FREE_TIER = true;

// Free animals available to all users
export const FREE_ANIMALS = ['lion', 'fox', 'penguin', 'bunny'];

// All animals in the app
export const ALL_ANIMALS = [
  'bear', 'bunny', 'elephant', 'fox', 'giraffe', 'hippo',
  'lion', 'monkey', 'penguin', 'tiger', 'turtle', 'zebra'
];

interface PurchaseContextType {
  isPremium: boolean;
  unlockPremium: () => Promise<void>;
  isAnimalUnlocked: (animalId: string) => boolean;
  getUnlockedAnimals: () => string[];
  canCreateHybrid: (animal1: string, animal2: string) => boolean;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

const PREMIUM_KEY = 'premium_unlocked';

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);

  // Load premium status from storage on mount
  useEffect(() => {
    async function loadPremiumStatus() {
      // Force free tier for testing if debug flag is enabled
      if (FORCE_FREE_TIER) {
        setIsPremium(false);
        return;
      }

      try {
        const value = await AsyncStorage.getItem(PREMIUM_KEY);
        setIsPremium(value === 'true');
      } catch (error) {
        // Default to free tier
        setIsPremium(false);
      }
    }
    loadPremiumStatus();
  }, []);

  const unlockPremium = async () => {
    try {
      // In production, this would be called after successful in-app purchase
      // For now, we'll just unlock locally
      await AsyncStorage.setItem(PREMIUM_KEY, 'true');
      setIsPremium(true);
    } catch (error) {
      throw new Error('Failed to unlock premium');
    }
  };

  const isAnimalUnlocked = (animalId: string): boolean => {
    if (isPremium) return true;
    return FREE_ANIMALS.includes(animalId);
  };

  const getUnlockedAnimals = (): string[] => {
    if (isPremium) return ALL_ANIMALS;
    return FREE_ANIMALS;
  };

  const canCreateHybrid = (animal1: string, animal2: string): boolean => {
    return isAnimalUnlocked(animal1) && isAnimalUnlocked(animal2);
  };

  return (
    <PurchaseContext.Provider
      value={{
        isPremium,
        unlockPremium,
        isAnimalUnlocked,
        getUnlockedAnimals,
        canCreateHybrid,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
}

export function usePurchase() {
  const context = useContext(PurchaseContext);
  if (!context) {
    throw new Error('usePurchase must be used within PurchaseProvider');
  }
  return context;
}
