import React, { useState, useRef } from 'react';
import { Pressable, Text, StyleSheet, Modal, View, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePurchase } from '../contexts/PurchaseContext';

interface UnlockButtonProps {
  position?: 'left' | 'center' | 'right';
}

export function UnlockButton({ position = 'right' }: UnlockButtonProps) {
  const { isPremium, purchaseUnlock } = usePurchase();
  const [showModal, setShowModal] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [birthYear, setBirthYear] = useState('');
  const [ageError, setAgeError] = useState('');

  // Single ref for the hidden input
  const yearInputRef = useRef<TextInput>(null);

  console.log('🔓 UnlockButton render - isPremium:', isPremium);

  // Don't show button if already premium
  if (isPremium) {
    console.log('🔓 Button hidden (premium user)');
    return null;
  }

  console.log('🔓 Button showing (free user)');

  const handleYearChange = (value: string) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    setBirthYear(value);
    setAgeError('');

    // Auto-submit when 4 digits entered
    if (value.length === 4) {
      setTimeout(() => handleVerifyAge(value), 300);
    }
  };

  const handleShowAgeVerification = () => {
    setShowModal(false);
    setBirthYear('');
    setAgeError('');
    setShowAgeVerification(true);
  };

  const handleVerifyAge = async (yearToVerify?: string) => {
    const yearStr = yearToVerify || birthYear;

    if (yearStr.length !== 4) {
      setAgeError('Please enter a complete year');
      return;
    }

    const year = parseInt(yearStr, 10);
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;

    if (year < 1900 || year > currentYear) {
      setAgeError('Please enter a valid year');
      return;
    }

    if (age < 18) {
      setAgeError('You must be 18 or older to purchase');
      return;
    }

    // Age verified, proceed with IAP purchase flow
    setShowAgeVerification(false);
    try {
      console.log('🔓 Starting purchase flow...');
      await purchaseUnlock();
      console.log('🔓 Purchase completed successfully!');
      // Small delay to ensure state updates propagate
      setTimeout(() => {
        setShowSuccessModal(true);
      }, 100);
    } catch (error) {
      console.log('💳 Purchase failed:', error);
      // Purchase was canceled or failed - could show error modal here
      setAgeError('Purchase failed. Please try again.');
      setShowAgeVerification(true);
    }
  };

  return (
    <>
      <Pressable
        style={[
          styles.button,
          position === 'center' && styles.buttonCentered,
          position === 'left' && styles.buttonLeft,
        ]}
        onPress={() => setShowModal(true)}
      >
        <MaterialCommunityIcons name="lock-open-variant" size={25} color="#101010" />
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
              Get all 12 animals and 66 amazing custom combinations for just $0.99!
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
                onPress={handleShowAgeVerification}
              >
                <MaterialCommunityIcons name="lock-open-variant" size={20} color="#101010" style={{ marginRight: 8 }} />
                <Text style={styles.modalButtonText}>Unlock for $0.99</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Age Verification Modal */}
      <Modal
        visible={showAgeVerification}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAgeVerification(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="shield-check" size={64} color="#FFD93D" style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Parent Verification</Text>
            <Text style={styles.modalMessage}>
              Please enter your birth year to confirm you are 18 or older
            </Text>

            {/* Visual 4 Digit Display with hidden input overlay */}
            <Pressable
              style={styles.yearInputContainer}
              onPress={() => yearInputRef.current?.focus()}
            >
              <View style={styles.yearInput}>
                <Text style={styles.yearDigit}>{birthYear[0] || ''}</Text>
              </View>
              <View style={styles.yearInput}>
                <Text style={styles.yearDigit}>{birthYear[1] || ''}</Text>
              </View>
              <View style={styles.yearInput}>
                <Text style={styles.yearDigit}>{birthYear[2] || ''}</Text>
              </View>
              <View style={styles.yearInput}>
                <Text style={styles.yearDigit}>{birthYear[3] || ''}</Text>
              </View>

              {/* Hidden input overlaid on top */}
              <TextInput
                ref={yearInputRef}
                style={styles.hiddenInput}
                keyboardType="number-pad"
                maxLength={4}
                value={birthYear}
                onChangeText={handleYearChange}
                caretHidden
              />
            </Pressable>

            {ageError ? (
              <Text style={styles.errorText}>{ageError}</Text>
            ) : null}

            <View style={styles.buttonRow}>
              <Pressable
                style={styles.modalButtonSecondary}
                onPress={() => setShowAgeVerification(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalButtonPrimary}
                onPress={() => handleVerifyAge()}
              >
                <MaterialCommunityIcons name="check-bold" size={20} color="#101010" style={{ marginRight: 8 }} />
                <Text style={styles.modalButtonText}>Verify & Unlock</Text>
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
              All animals unlocked! Have fun creating amazing custom creatures! 🎨
            </Text>
            <Pressable
              style={styles.modalButtonPrimary}
              onPress={() => {
                console.log('🔓 Success modal closed, isPremium should be true');
                setShowSuccessModal(false);
              }}
            >
              <MaterialCommunityIcons name="thumb-up" size={20} color="#101010" style={{ marginRight: 8 }} />
              <Text style={styles.modalButtonText}>Let's Go!</Text>
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
    gap: 10,
    backgroundColor: '#FDC700',
    paddingVertical: 16,
    paddingHorizontal: 23,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  buttonCentered: {
    right: 'auto',
    left: '50%',
    transform: [{ translateX: -50 }],
  },
  buttonLeft: {
    right: 'auto',
    left: 16,
  },
  text: {
    fontFamily: 'MadimiOne_400Regular',
    color: '#101010',
    fontSize: 23,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: 'transparent',
  },
  yearInputContainer: {
    position: 'relative',
    flexDirection: 'row',
    gap: 16,
    marginVertical: 24,
  },
  yearInput: {
    width: 60,
    height: 70,
    borderWidth: 2,
    borderColor: '#FDC700',
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearDigit: {
    fontSize: 32,
    fontFamily: 'MadimiOne_400Regular',
    color: '#101010',
  },
  errorText: {
    fontFamily: 'MadimiOne_400Regular',
    fontSize: 14,
    color: '#FF3E9E',
    marginBottom: 16,
    textAlign: 'center',
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
    width: 480,
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
    backgroundColor: '#FDC700',
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
    fontSize: 20,
    color: '#101010',
  },
  modalButtonSecondaryText: {
    fontFamily: 'MadimiOne_400Regular',
    fontSize: 16,
    color: '#333',
  },
});
