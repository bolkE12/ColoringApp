import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

interface MusicContextType {
  isMusicPlaying: boolean;
  toggleMusic: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Load and setup the music
  useEffect(() => {
    let mounted = true;

    async function setupMusic() {
      try {
        // Set audio mode for background music
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        // Load the MP3 file
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/music.mp3'),
          {
            shouldPlay: true,
            isLooping: true,
            volume: 0.25, // Set volume to 25%
          }
        );

        if (mounted) {
          soundRef.current = sound;
        }
      } catch (error) {
        console.error('Error loading background music:', error);
      }
    }

    setupMusic();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Toggle music on/off
  const toggleMusic = async () => {
    if (!soundRef.current) return;

    try {
      const status = await soundRef.current.getStatusAsync();

      if (status.isLoaded) {
        if (isMusicPlaying) {
          await soundRef.current.pauseAsync();
          setIsMusicPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsMusicPlaying(true);
        }
      }
    } catch (error) {
      console.error('Error toggling music:', error);
    }
  };

  return (
    <MusicContext.Provider value={{ isMusicPlaying, toggleMusic }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
