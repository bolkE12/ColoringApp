import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditionally import IAP - allows testing in Expo Go
let InAppPurchases: any = null;
try {
  InAppPurchases = require('expo-in-app-purchases');
} catch (error) {
  console.log('⚠️ IAP not available (Expo Go mode)');
}

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

  // Store pending purchase promise callbacks
  const purchaseCallbacks = useRef<{
    resolve?: () => void;
    reject?: (error: Error) => void;
  }>({});

  // Connect to IAP on mount
  useEffect(() => {
    if (!InAppPurchases) {
      console.log('💳 Expo Go mode - IAP disabled, use test unlock');
      return;
    }

    let purchaseListener: any;

    async function initialize() {
      try {
        await InAppPurchases.connectAsync();
        console.log('💳 IAP connected');

        // Set up purchase listener
        purchaseListener = InAppPurchases.setPurchaseListener(async ({ responseCode, results }) => {
          if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
            for (const purchase of results) {
              if (purchase.productId === PRODUCT_ID) {
                console.log('💳 Purchase successful');
                await unlockPremium();
                await InAppPurchases.finishTransactionAsync(purchase, true);

                // Resolve the pending purchase promise
                if (purchaseCallbacks.current.resolve) {
                  purchaseCallbacks.current.resolve();
                  purchaseCallbacks.current = {};
                }
              }
            }
          } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
            console.log('💳 Purchase canceled');
            if (purchaseCallbacks.current.reject) {
              purchaseCallbacks.current.reject(new Error('Purchase canceled'));
              purchaseCallbacks.current = {};
            }
          } else {
            console.log('💳 Purchase failed:', responseCode);
            if (purchaseCallbacks.current.reject) {
              purchaseCallbacks.current.reject(new Error('Purchase failed'));
              purchaseCallbacks.current = {};
            }
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
    if (!InAppPurchases) return;

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
    // Expo Go mode - simulate purchase for testing
    if (!InAppPurchases) {
      console.log('💳 Expo Go mode - simulating purchase for testing');
      await unlockPremium();
      return;
    }

    return new Promise<void>(async (resolve, reject) => {
      try {
        console.log('💳 Getting products...');

        const { responseCode, results } = await InAppPurchases.getProductsAsync([PRODUCT_ID]);

        if (responseCode !== InAppPurchases.IAPResponseCode.OK || !results || results.length === 0) {
          console.log('💳 Product not found, response code:', responseCode);
          reject(new Error('Product not available'));
          return;
        }

        console.log('💳 Product found:', results[0]);
        console.log('💳 Starting purchase...');

        // Store callbacks for the purchase listener to call
        purchaseCallbacks.current = { resolve, reject };

        await InAppPurchases.purchaseItemAsync(PRODUCT_ID);

        // Purchase listener will call resolve/reject when done
      } catch (error: any) {
        console.log('💳 Purchase error:', error);
        reject(error);
      }
    });
  };

  // Restore purchases
  const restorePurchases = async (): Promise<boolean> => {
    if (!InAppPurchases) {
      console.log('💳 Expo Go mode - no restore available');
      return false;
    }

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
