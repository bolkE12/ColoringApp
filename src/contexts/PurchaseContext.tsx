import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';
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

  // Unlock premium (defined early so it's available in useEffect)
  const unlockPremium = async () => {
    try {
      await AsyncStorage.setItem(PREMIUM_KEY, 'true');
      setIsPremium(true);
      console.log('🔓 Premium unlocked');
    } catch (error) {
      throw new Error('Failed to unlock premium');
    }
  };

  // Initialize IAP connection on mount
  useEffect(() => {
    async function initializeIAP() {
      if (FORCE_FREE_TIER) {
        console.log('💳 Free tier mode enabled');
        return;
      }

      try {
        console.log('💳 Initializing IAP connection...');
        await RNIap.initConnection();
        console.log('💳 IAP Connected');

        // Set up purchase update listener
        const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
          console.log('💳 Purchase updated:', purchase);
          const receipt = purchase.transactionReceipt;

          if (receipt) {
            try {
              // Unlock premium
              await AsyncStorage.setItem(PREMIUM_KEY, 'true');
              setIsPremium(true);
              console.log('💳 Purchase successful, finishing transaction');

              // Finish the transaction
              await RNIap.finishTransaction({ purchase, isConsumable: false });
            } catch (error) {
              console.log('💳 Error finishing transaction:', error);
            }
          }
        });

        const purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
          console.log('💳 Purchase error:', error);
        });

        // Cleanup subscriptions on unmount
        return () => {
          purchaseUpdateSubscription.remove();
          purchaseErrorSubscription.remove();
          RNIap.endConnection();
        };
      } catch (error) {
        console.log('💳 IAP Connection failed:', error);
      }
    }

    const cleanup = initializeIAP();
    return () => {
      cleanup?.then((fn) => fn?.());
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
      console.log('💳 Platform:', Platform.OS);

      // Get products (iOS and Android use different product arrays)
      const productIds = Platform.OS === 'ios'
        ? [IAP_PRODUCTS.UNLOCK_ALL]  // iOS uses subscription/IAP format
        : [IAP_PRODUCTS.UNLOCK_ALL]; // Android uses same format

      console.log('💳 Fetching products:', productIds);
      const products = await RNIap.getProducts({ skus: productIds });

      console.log('💳 Products received:', products);
      console.log('💳 Number of products:', products?.length);

      if (!products || products.length === 0) {
        console.log('💳 ERROR: No products found!');
        console.log('💳 Make sure IAP product exists in App Store Connect/Play Console');
        console.log('💳 Product ID must be:', IAP_PRODUCTS.UNLOCK_ALL);
        throw new Error('Product not available. Please try again later.');
      }

      console.log('💳 Product found:', JSON.stringify(products[0]));

      // Purchase the product
      console.log('💳 Requesting purchase for SKU:', IAP_PRODUCTS.UNLOCK_ALL);
      await RNIap.requestPurchase({ sku: IAP_PRODUCTS.UNLOCK_ALL });

      console.log('💳 Purchase request sent, waiting for listener...');
      // The purchase will be handled by the purchaseUpdatedListener set up in useEffect
    } catch (error: any) {
      console.log('💳 Purchase error details:', JSON.stringify(error));
      console.log('💳 Error code:', error.code);
      console.log('💳 Error message:', error.message);

      if (error.code === 'E_USER_CANCELLED') {
        throw new Error('Purchase canceled');
      }

      // Better error messages
      if (error.message?.includes('Product not available')) {
        throw new Error('Product not available. Please try again later.');
      }

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

      // Get purchase history
      const purchases = await RNIap.getAvailablePurchases();
      console.log('💳 Available purchases:', purchases);

      if (purchases && purchases.length > 0) {
        const hasUnlockPurchase = purchases.some(
          (purchase) => purchase.productId === IAP_PRODUCTS.UNLOCK_ALL
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
