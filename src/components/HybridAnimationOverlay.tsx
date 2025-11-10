import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
  Modal,
} from "react-native";
import { getBaseRequire } from "../../assets/base";
import { getHybridRequire } from "../../assets/hybrid";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;
const TILE_SIZE = 140;

interface HybridAnimationOverlayProps {
  visible: boolean;
  animal1: string;
  animal2: string;
  hybridKey: string;
  onComplete: () => void;
}

export const HybridAnimationOverlay: React.FC<HybridAnimationOverlayProps> = ({
  visible,
  animal1,
  animal2,
  hybridKey,
  onComplete,
}) => {
  // Animation values
  const animal1X = useRef(new Animated.Value(-TILE_SIZE)).current;
  const animal1Y = useRef(new Animated.Value(CENTER_Y - TILE_SIZE / 2)).current;
  const animal1Scale = useRef(new Animated.Value(1)).current;
  const animal1Rotate = useRef(new Animated.Value(0)).current;
  const animal1Opacity = useRef(new Animated.Value(1)).current;

  const animal2X = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const animal2Y = useRef(new Animated.Value(CENTER_Y - TILE_SIZE / 2)).current;
  const animal2Scale = useRef(new Animated.Value(1)).current;
  const animal2Rotate = useRef(new Animated.Value(0)).current;
  const animal2Opacity = useRef(new Animated.Value(1)).current;

  const hybridScale = useRef(new Animated.Value(0)).current;
  const hybridOpacity = useRef(new Animated.Value(0)).current;
  const hybridRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset all animations
      animal1X.setValue(-TILE_SIZE);
      animal1Y.setValue(CENTER_Y - TILE_SIZE / 2);
      animal1Scale.setValue(1);
      animal1Rotate.setValue(0);
      animal1Opacity.setValue(1);

      animal2X.setValue(SCREEN_WIDTH);
      animal2Y.setValue(CENTER_Y - TILE_SIZE / 2);
      animal2Scale.setValue(1);
      animal2Rotate.setValue(0);
      animal2Opacity.setValue(1);

      hybridScale.setValue(0);
      hybridOpacity.setValue(0);
      hybridRotate.setValue(0);

      // Sequence of animations
      Animated.sequence([
        // Phase 1: Animals slide in from sides toward center (800ms)
        Animated.parallel([
          Animated.timing(animal1X, {
            toValue: CENTER_X - TILE_SIZE - 20,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animal2X, {
            toValue: CENTER_X + 20,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // Add slight rotation as they move
          Animated.timing(animal1Rotate, {
            toValue: -15,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animal2Rotate, {
            toValue: 15,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),

        // Phase 2: Quick smash together (300ms)
        Animated.parallel([
          Animated.timing(animal1X, {
            toValue: CENTER_X - TILE_SIZE / 2,
            duration: 300,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animal2X, {
            toValue: CENTER_X - TILE_SIZE / 2,
            duration: 300,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          // Spin faster as they collide
          Animated.timing(animal1Rotate, {
            toValue: -360,
            duration: 300,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animal2Rotate, {
            toValue: 360,
            duration: 300,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          // Scale up on collision
          Animated.timing(animal1Scale, {
            toValue: 1.3,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(animal2Scale, {
            toValue: 1.3,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),

        // Phase 3: Collision impact - scale down and fade out (200ms)
        Animated.parallel([
          Animated.timing(animal1Scale, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animal2Scale, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animal1Opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(animal2Opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),

        // Phase 4: Hybrid appears with explosion effect (500ms)
        Animated.parallel([
          Animated.spring(hybridScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(hybridOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(hybridRotate, {
            toValue: 360,
            duration: 500,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]),

        // Phase 5: Hold for a moment (300ms)
        Animated.delay(300),
      ]).start(() => {
        // Animation complete, trigger navigation
        onComplete();
      });
    }
  }, [visible]);

  if (!visible) return null;

  const animal1Image = getBaseRequire(animal1 as any);
  const animal2Image = getBaseRequire(animal2 as any);
  const hybridImage = getHybridRequire(hybridKey);

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        {/* Animal 1 */}
        <Animated.View
          style={[
            styles.animalContainer,
            {
              transform: [
                { translateX: animal1X },
                { translateY: animal1Y },
                { scale: animal1Scale },
                {
                  rotate: animal1Rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
              opacity: animal1Opacity,
            },
          ]}
        >
          <Image source={animal1Image} style={styles.animalImage} resizeMode="contain" />
        </Animated.View>

        {/* Animal 2 */}
        <Animated.View
          style={[
            styles.animalContainer,
            {
              transform: [
                { translateX: animal2X },
                { translateY: animal2Y },
                { scale: animal2Scale },
                {
                  rotate: animal2Rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
              opacity: animal2Opacity,
            },
          ]}
        >
          <Image source={animal2Image} style={styles.animalImage} resizeMode="contain" />
        </Animated.View>

        {/* Hybrid Result */}
        <Animated.View
          style={[
            styles.hybridContainer,
            {
              transform: [
                { scale: hybridScale },
                {
                  rotate: hybridRotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
              opacity: hybridOpacity,
            },
          ]}
        >
          <Image source={hybridImage} style={styles.hybridImage} resizeMode="contain" />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(76, 160, 232, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  animalContainer: {
    position: "absolute",
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  animalImage: {
    width: "100%",
    height: "100%",
  },
  hybridContainer: {
    position: "absolute",
    width: TILE_SIZE * 1.5,
    height: TILE_SIZE * 1.5,
    backgroundColor: "#fff",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 15,
    left: CENTER_X - (TILE_SIZE * 1.5) / 2,
    top: CENTER_Y - (TILE_SIZE * 1.5) / 2,
  },
  hybridImage: {
    width: "100%",
    height: "100%",
  },
});
