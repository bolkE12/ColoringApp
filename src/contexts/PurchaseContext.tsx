import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as InAppPurchases from 'expo-in-app-purchases';

// Free animals available to all users
export const FREE_ANIMALS = ['lion', 'fox', 'penguin', 'bunny'];

// All animals in the app
export const ALL_ANIMALS = [
  'bear', 'bunny', 'elephant', 'fox', 'giraffe', 'hippo',
  'lion', 'monkey', 'penguin', 'tiger', 'turtle', 'zebra'
];

// IAP Product ID - must match App Store Connect
const PRODUCT_ID = 'unlock_all';
const PREMIUM_KEY = 'premium_unlocked';

interface PurchaseContextType {
  isPremium: boolean;
  unlockPremium: () => Promise<void>;
  purchaseUnlock: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  isAnimalUnlocked: (animalId: string) => boolean;
  getUnlockedAnimals: () => string[];
  canCreateHybrid: (animal1: string, animal2: string) => boolean;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);

  // Connect to IAP on mount
  useEffect(() => {
    let purchaseListener: any;

    async function initialize() {
      try {
        await InAppPurchases.connectAsync();
        console.log('💳 IAP connected');

        // Set up purchase listener
        purchaseListener = InAppPurchases.setPurchaseListener(({ responseCode, results }) => {
          if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
            for (const purchase of results) {
              if (purchase.productId === PRODUCT_ID) {
                console.log('💳 Purchase successful');
                unlockPremium();
                InAppPurchases.finishTransactionAsync(purchase, true);
              }
            }
          } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
            console.log('💳 Purchase canceled');
          } else {
            console.log('💳 Purchase failed:', responseCode);
          }
        });

        // Check for existing purchases on startup
        await checkPurchaseHistory();
      } catch (error) {
        console.log('💳 IAP init error:', error);
      }
    }

    initialize();

    return () => {
      if (purchaseListener) {
        purchaseListener.remove();
      }
      InAppPurchases.disconnectAsync();
    };
  }, []);

  // Load saved premium status
  useEffect(() => {
    async function loadPremiumStatus() {
      try {
        const value = await AsyncStorage.getItem(PREMIUM_KEY);
        if (value === 'true') {
          setIsPremium(true);
          console.log('🔓 Premium status loaded: true');
        }
      } catch (error) {
        console.log('🔓 Error loading premium status:', error);
      }
    }
    loadPremiumStatus();
  }, []);

  // Check purchase history for existing purchases
  const checkPurchaseHistory = async () => {
    try {
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        const hasUnlock = results.some((p: any) => p.productId === PRODUCT_ID);
        if (hasUnlock) {
          await unlockPremium();
          console.log('💳 Found existing purchase');
        }
      }
    } catch (error) {
      console.log('💳 Error checking purchase history:', error);
    }
  };

  // Unlock premium
  const unlockPremium = async () => {
    try {
      await AsyncStorage.setItem(PREMIUM_KEY, 'true');
      setIsPremium(true);
      console.log('🔓 Premium unlocked');
    } catch (error) {
      console.log('🔓 Error unlocking premium:', error);
    }
  };

  // Start purchase flow
  const purchaseUnlock = async () => {
    try {
      console.log('💳 Getting products...');

      const { responseCode, results } = await InAppPurchases.getProductsAsync([PRODUCT_ID]);

      if (responseCode !== InAppPurchases.IAPResponseCode.OK || !results || results.length === 0) {
        console.log('💳 Product not found, response code:', responseCode);
        throw new Error('Product not available');
      }

      console.log('💳 Product found:', results[0]);
      console.log('💳 Starting purchase...');

      await InAppPurchases.purchaseItemAsync(PRODUCT_ID);

      // Purchase listener will handle the response
    } catch (error: any) {
      console.log('💳 Purchase error:', error);
      throw error;
    }
  };

  // Restore purchases
  const restorePurchases = async (): Promise<boolean> => {
    try {
      await checkPurchaseHistory();
      return isPremium;
    } catch (error) {
      console.log('💳 Restore error:', error);
      return false;
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
        purchaseUnlock,
        restorePurchases,
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
