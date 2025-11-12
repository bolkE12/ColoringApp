import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusic } from '../contexts/MusicContext';

export function MusicToggle() {
  const { isMusicPlaying, toggleMusic } = useMusic();

  return (
    <Pressable
      onPress={toggleMusic}
      style={styles.musicBtn}
      accessibilityLabel={isMusicPlaying ? "Turn music off" : "Turn music on"}
    >
      {isMusicPlaying ? (
        <Ionicons name="musical-notes" size={24} color="#fff" />
      ) : (
        <Ionicons name="volume-mute" size={24} color="#fff" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  musicBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
});
