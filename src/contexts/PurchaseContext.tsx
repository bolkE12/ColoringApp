import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as InAppPurchases from 'expo-in-app-purchases';
import { IAP_PRODUCTS } from '../config/iap';

// ⚠️ DEBUG: Set to true to force free tier for testing (ignores AsyncStorage & IAP)
// ⚠️ PRODUCTION: Set to false before releasing to App Store/Play Store
const FORCE_FREE_TIER = false;

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
  purchaseUnlock: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  isAnimalUnlocked: (animalId: string) => boolean;
  getUnlockedAnimals: () => string[];
  canCreateHybrid: (animal1: string, animal2: string) => boolean;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

const PREMIUM_KEY = 'premium_unlocked';

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);

  // Initialize IAP connection on mount
  useEffect(() => {
    async function initializeIAP() {
      if (FORCE_FREE_TIER) {
        console.log('💳 Free tier mode enabled');
        return;
      }

      try {
        await InAppPurchases.connectAsync();
        console.log('💳 IAP Connected');
      } catch (error) {
        console.log('💳 IAP Connection failed:', error);
      }
    }

    initializeIAP();

    // Cleanup on unmount
    return () => {
      if (!FORCE_FREE_TIER) {
        InAppPurchases.disconnectAsync();
      }
    };
  }, []);

  // Load premium status from storage on mount
  useEffect(() => {
    async function loadPremiumStatus() {
      console.log('🔓 FORCE_FREE_TIER:', FORCE_FREE_TIER);

      // Force free tier for testing if debug flag is enabled
      if (FORCE_FREE_TIER) {
        console.log('🔓 Setting isPremium to FALSE (free tier)');
        setIsPremium(false);
        return;
      }

      try {
        const value = await AsyncStorage.getItem(PREMIUM_KEY);
        console.log('🔓 Loaded from storage:', value);
        const hasPurchase = value === 'true';

        // If not unlocked locally, check IAP purchase history
        if (!hasPurchase) {
          const restored = await restorePurchases();
          if (!restored) {
            setIsPremium(false);
          }
        } else {
          setIsPremium(true);
        }
      } catch (error) {
        console.log('🔓 Error loading, defaulting to free');
        setIsPremium(false);
      }
    }
    loadPremiumStatus();
  }, []);

  // Unlock premium (called after successful purchase)
  const unlockPremium = async () => {
    try {
      await AsyncStorage.setItem(PREMIUM_KEY, 'true');
      setIsPremium(true);
      console.log('🔓 Premium unlocked');
    } catch (error) {
      throw new Error('Failed to unlock premium');
    }
  };

  // Purchase unlock via IAP
  const purchaseUnlock = async () => {
    // In development mode (simulator/Expo Go), allow test unlocking
    if (__DEV__) {
      console.log('💳 Development mode detected, unlocking for testing');
      await unlockPremium();
      return;
    }

    if (FORCE_FREE_TIER) {
      console.log('💳 Free tier mode enabled, unlocking for testing');
      await unlockPremium();
      return;
    }

    try {
      console.log('💳 Starting purchase flow');

      // Get products
      const { results, responseCode } = await InAppPurchases.getProductsAsync([
        IAP_PRODUCTS.UNLOCK_ALL,
      ]);

      console.log('💳 Get products response code:', responseCode);
      console.log('💳 Products:', results);

      if (responseCode !== InAppPurchases.IAPResponseCode.OK || !results || results.length === 0) {
        console.log('💳 ERROR: Product not found!');
        console.log('💳 Response code:', responseCode);
        throw new Error('Product not available. Please try again later.');
      }

      console.log('💳 Product found:', results[0]);

      // Set up purchase listener BEFORE making purchase
      InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }: any) => {
        console.log('💳 Purchase response code:', responseCode);
        console.log('💳 Purchase error code:', errorCode);
        console.log('💳 Purchase results:', results);

        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          console.log('💳 Purchase successful');
          await unlockPremium();

          // Finish transaction
          if (results && results.length > 0) {
            await InAppPurchases.finishTransactionAsync(results[0], true);
          }
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('💳 Purchase canceled by user');
        } else {
          console.log('💳 Purchase failed with error code:', errorCode);
        }
      });

      // Purchase the product
      console.log('💳 Requesting purchase for:', results[0].productId);
      await InAppPurchases.purchaseItemAsync(results[0].productId);

    } catch (error: any) {
      console.log('💳 Purchase error:', error);
      console.log('💳 Error message:', error.message);
      throw new Error(error.message || 'Purchase failed. Please try again.');
    }
  };

  // Restore previous purchases
  const restorePurchases = async (): Promise<boolean> => {
    if (FORCE_FREE_TIER) {
      console.log('💳 Free tier mode enabled, cannot restore purchases');
      return false;
    }

    try {
      console.log('💳 Restoring purchases');

      const { results, responseCode } = await InAppPurchases.getPurchaseHistoryAsync();

      console.log('💳 Restore response code:', responseCode);
      console.log('💳 Purchase history:', results);

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        const hasUnlockPurchase = results.some(
          (purchase: any) => purchase.productId === IAP_PRODUCTS.UNLOCK_ALL
        );

        if (hasUnlockPurchase) {
          console.log('💳 Found previous purchase, unlocking');
          await unlockPremium();
          return true;
        }
      }

      console.log('💳 No previous purchases found');
      return false;
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
