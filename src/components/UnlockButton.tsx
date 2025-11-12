import React from 'react';
import { Pressable, Text, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePurchase } from '../contexts/PurchaseContext';

export function UnlockButton() {
  const { isPremium, unlockPremium } = usePurchase();

  // Don't show button if already premium
  if (isPremium) {
    return null;
  }

  const handlePress = () => {
    Alert.alert(
      'Unlock Everything',
      'Get all 12 animals and 66 hybrid combinations for just $0.99!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock for $0.99',
          onPress: async () => {
            try {
              // In production, this would trigger the in-app purchase flow
              // For now, we'll unlock immediately for testing
              await unlockPremium();
              Alert.alert(
                'Success!',
                'All animals unlocked! Have fun creating amazing hybrids! 🎨'
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to unlock. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Pressable style={styles.button} onPress={handlePress}>
      <MaterialCommunityIcons name="lock-open-variant" size={16} color="#fff" />
      <Text style={styles.text}>Unlock everything for $0.99</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF3E9E',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  text: {
    fontFamily: 'MadimiOne_400Regular',
    color: '#fff',
    fontSize: 14,
  },
});
