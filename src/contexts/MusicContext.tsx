import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAudioPlayer, AudioSource, setAudioModeAsync } from 'expo-audio';

interface MusicContextType {
  isMusicPlaying: boolean;
  toggleMusic: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const player = useAudioPlayer(require('../../assets/music.mp3') as AudioSource);

  // Setup audio mode on mount
  useEffect(() => {
    async function setupAudioMode() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
        });
      } catch (error) {
        // Silently fail - audio mode is optional
      }
    }

    setupAudioMode();
  }, []);

  // Start playing music when player is ready
  useEffect(() => {
    if (player) {
      player.loop = true;
      player.volume = 0.125; // 50% quieter than original 0.25
      player.play();
    }
  }, [player]);

  // Toggle music on/off
  const toggleMusic = () => {
    try {
      if (isMusicPlaying) {
        player.pause();
        setIsMusicPlaying(false);
      } else {
        player.play();
        setIsMusicPlaying(true);
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
