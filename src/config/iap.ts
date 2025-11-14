/**
 * In-App Purchase Configuration
 *
 * IMPORTANT: Before going live, you must:
 * 1. Create these products in Apple App Store Connect
 * 2. Create these products in Google Play Console
 * 3. Use the EXACT product IDs defined here
 */

// Product IDs must match what you create in App Store Connect and Google Play Console
export const IAP_PRODUCTS = {
  UNLOCK_ALL: 'unlock_all', // Non-consumable / One-time purchase
};

// Product details for display
export const PRODUCT_DETAILS = {
  [IAP_PRODUCTS.UNLOCK_ALL]: {
    title: 'Unlock Everything',
    description: 'Get all 12 animals and 66 amazing hybrid combinations!',
    price: '$0.99',
  },
};

// For testing in development
export const IAP_SANDBOX_MODE = __DEV__;
