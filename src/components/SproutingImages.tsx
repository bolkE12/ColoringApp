import React, { useEffect, useState, useRef } from 'react';
import { View, Image, Animated, Dimensions, StyleSheet } from 'react-native';
import { getSavedAnimals, SavedAnimal } from '../utils/savedAnimals';

interface SproutingImage {
  id: string;
  imageUri: string;
  position: number; // horizontal position (0-1)
  animatedValue: Animated.Value;
  size: number; // random size variation
}

export function SproutingImages() {
  const [savedAnimals, setSavedAnimals] = useState<SavedAnimal[]>([]);
  const [activeImages, setActiveImages] = useState<SproutingImage[]>([]);
  const nextIndexRef = useRef(0);
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  // Load saved animals
  useEffect(() => {
    async function loadAnimals() {
      try {
        const animals = await getSavedAnimals();
        if (animals.length > 0) {
          setSavedAnimals(animals);
        }
      } catch (error) {
        // Silently fail if no animals
      }
    }
    loadAnimals();
  }, []);

  // Start sprouting cycle when we have animals
  useEffect(() => {
    if (savedAnimals.length === 0) return;

    const interval = setInterval(() => {
      setActiveImages((current) => {
        // Only spawn if we have fewer than 4 active
        if (current.length >= 4) return current;

        // Pick a random animal
        const randomAnimal = savedAnimals[Math.floor(Math.random() * savedAnimals.length)];

        // Create new sprouting image
        const newImage: SproutingImage = {
          id: `${randomAnimal.id}-${Date.now()}`,
          imageUri: randomAnimal.imageUri,
          position: Math.random(), // Random horizontal position
          animatedValue: new Animated.Value(0),
          size: 80 + Math.random() * 40, // Random size between 80-120px
        };

        // Start animation
        Animated.sequence([
          // Sprout up
          Animated.spring(newImage.animatedValue, {
            toValue: 1,
            tension: 80,
            friction: 8,
            useNativeDriver: true,
          }),
          // Wait 3 seconds
          Animated.delay(3000),
          // Go back down
          Animated.timing(newImage.animatedValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Remove this image after animation completes
          setActiveImages((images) => images.filter((img) => img.id !== newImage.id));
        });

        return [...current, newImage];
      });
    }, 1500); // Try to spawn a new image every 1.5 seconds

    return () => clearInterval(interval);
  }, [savedAnimals]);

  if (savedAnimals.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {activeImages.map((image) => {
        const translateY = image.animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [150, -SCREEN_HEIGHT * 0.25], // Start below screen, end at 25% from bottom
        });

        const scale = image.animatedValue.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0.5, 1.1, 1], // Small bounce effect
        });

        const rotate = image.animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${(Math.random() - 0.5) * 20}deg`], // Slight random rotation
        });

        // Position from left edge
        const leftPosition = image.position * (SCREEN_WIDTH - image.size - 32) + 16;

        return (
          <Animated.View
            key={image.id}
            style={[
              styles.imageContainer,
              {
                left: leftPosition,
                width: image.size,
                height: image.size,
                transform: [
                  { translateY },
                  { scale },
                  { rotate },
                ],
              },
            ]}
          >
            <Image
              source={{ uri: image.imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    zIndex: 0, // Behind other UI elements
  },
  imageContainer: {
    position: 'absolute',
    bottom: 0,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
