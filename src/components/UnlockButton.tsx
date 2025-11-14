import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, Modal, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePurchase } from '../contexts/PurchaseContext';

export function UnlockButton() {
  const { isPremium, unlockPremium } = usePurchase();
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  console.log('🔓 UnlockButton render - isPremium:', isPremium);

  // Don't show button if already premium
  if (isPremium) {
    console.log('🔓 Button hidden (premium user)');
    return null;
  }

  console.log('🔓 Button showing (free user)');

  const handleUnlock = async () => {
    setShowModal(false);
    try {
      // In production, this would trigger the in-app purchase flow
      // For now, we'll unlock immediately for testing
      await unlockPremium();
      setShowSuccessModal(true);
    } catch (error) {
      // Could show error modal here
    }
  };

  return (
    <>
      <Pressable style={styles.button} onPress={() => setShowModal(true)}>
        <MaterialCommunityIcons name="lock-open-variant" size={16} color="#fff" />
        <Text style={styles.text}>Unlock everything for $0.99</Text>
      </Pressable>

      {/* Unlock Confirmation Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="star-circle" size={64} color="#FFD93D" style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Unlock Everything!</Text>
            <Text style={styles.modalMessage}>
              Get all 12 animals and 66 amazing hybrid combinations for just $0.99! 🎨
            </Text>
            <View style={styles.buttonRow}>
              <Pressable
                style={styles.modalButtonSecondary}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Maybe Later</Text>
              </Pressable>
              <Pressable
                style={styles.modalButtonPrimary}
                onPress={handleUnlock}
              >
                <MaterialCommunityIcons name="lock-open-variant" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.modalButtonText}>Unlock for $0.99</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="shimmer" size={64} color="#FFD93D" style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Amazing!</Text>
            <Text style={styles.modalMessage}>
              All animals unlocked! Have fun creating amazing hybrids! 🎨
            </Text>
            <Pressable
              style={styles.modalButtonPrimary}
              onPress={() => setShowSuccessModal(false)}
            >
              <MaterialCommunityIcons name="thumb-up" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.modalButtonText}>Awesome!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: 'MadimiOne_400Regular',
    fontSize: 32,
    color: '#FF3E9E',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: 'MadimiOne_400Regular',
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3E9E',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalButtonSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  modalButtonText: {
    fontFamily: 'MadimiOne_400Regular',
    fontSize: 16,
    color: '#fff',
  },
  modalButtonSecondaryText: {
    fontFamily: 'MadimiOne_400Regular',
    fontSize: 16,
    color: '#333',
  },
});
