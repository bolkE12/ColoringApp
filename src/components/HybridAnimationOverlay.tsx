import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
  Modal,
  Text,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getBaseRequire } from "../../assets/base";
import { HYBRID_SOURCES } from "../../assets/hybrid";

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
  const hybridY = useRef(new Animated.Value(0)).current;

  // Collision effect animations
  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const starsScale = useRef(new Animated.Value(0)).current;
  const starsOpacity = useRef(new Animated.Value(0)).current;
  const starsRotate = useRef(new Animated.Value(0)).current;

  // Confetti animations
  const confettiOpacity = useRef(new Animated.Value(0)).current;
  const confettiY = useRef(new Animated.Value(0)).current;

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
      hybridY.setValue(0);

      burstScale.setValue(0);
      burstOpacity.setValue(0);
      starsScale.setValue(0);
      starsOpacity.setValue(0);
      starsRotate.setValue(0);
      confettiOpacity.setValue(0);
      confettiY.setValue(0);

      // Sequence of animations
      Animated.sequence([
        // Phase 1: Animals slide in from sides toward center (1000ms)
        Animated.parallel([
          Animated.timing(animal1X, {
            toValue: CENTER_X - TILE_SIZE - 20,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animal2X, {
            toValue: CENTER_X + 20,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // Add slight rotation as they move
          Animated.timing(animal1Rotate, {
            toValue: -15,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animal2Rotate, {
            toValue: 15,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),

        // Phase 2: Quick smash together (375ms)
        Animated.parallel([
          Animated.timing(animal1X, {
            toValue: CENTER_X - TILE_SIZE / 2,
            duration: 375,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animal2X, {
            toValue: CENTER_X - TILE_SIZE / 2,
            duration: 375,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          // Spin faster as they collide
          Animated.timing(animal1Rotate, {
            toValue: -360,
            duration: 375,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animal2Rotate, {
            toValue: 360,
            duration: 375,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          // Scale up on collision
          Animated.timing(animal1Scale, {
            toValue: 1.3,
            duration: 188,
            useNativeDriver: true,
          }),
          Animated.timing(animal2Scale, {
            toValue: 1.3,
            duration: 188,
            useNativeDriver: true,
          }),
        ]),

        // Phase 3: Collision impact - scale down and fade out with burst effects (250ms)
        Animated.parallel([
          Animated.timing(animal1Scale, {
            toValue: 0,
            duration: 250,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animal2Scale, {
            toValue: 0,
            duration: 250,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animal1Opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(animal2Opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          // Burst effect
          Animated.sequence([
            Animated.parallel([
              Animated.timing(burstScale, {
                toValue: 2.5,
                duration: 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(burstOpacity, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(burstOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]),
          // Stars burst effect
          Animated.parallel([
            Animated.timing(starsScale, {
              toValue: 1.5,
              duration: 250,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(starsOpacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(starsRotate, {
              toValue: 360,
              duration: 250,
              useNativeDriver: true,
            }),
          ]),
        ]),

        // Phase 4: Hybrid appears with explosion effect (625ms)
        Animated.parallel([
          Animated.spring(hybridScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(hybridOpacity, {
            toValue: 1,
            duration: 375,
            useNativeDriver: true,
          }),
          Animated.timing(hybridRotate, {
            toValue: 360,
            duration: 625,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          // Fade out collision effects
          Animated.timing(starsOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          // Trigger confetti
          Animated.timing(confettiOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(confettiY, {
            toValue: SCREEN_HEIGHT,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),

        // Phase 5: Hold for a moment (375ms)
        Animated.delay(375),

        // Phase 6: Hybrid enlarges and flies towards screen (750ms)
        Animated.parallel([
          Animated.timing(hybridScale, {
            toValue: 3.5,
            duration: 750,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(hybridY, {
            toValue: -100,
            duration: 750,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(hybridOpacity, {
            toValue: 0,
            duration: 750,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Animation complete, trigger navigation
        onComplete();
      });
    }
  }, [visible]);

  if (!visible) return null;

  const animal1Image = getBaseRequire(animal1 as any);
  const animal2Image = getBaseRequire(animal2 as any);
  const hybridImage = HYBRID_SOURCES[hybridKey];

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

        {/* Collision Burst Effect */}
        <Animated.View
          style={[
            styles.burstEffect,
            {
              transform: [{ scale: burstScale }],
              opacity: burstOpacity,
            },
          ]}
        />

        {/* Collision Stars */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => {
          const radians = (angle * Math.PI) / 180;
          const distance = 80;
          const x = Math.cos(radians) * distance;
          const y = Math.sin(radians) * distance;

          return (
            <Animated.View
              key={index}
              style={[
                styles.star,
                {
                  left: CENTER_X + x - 15,
                  top: CENTER_Y + y - 15,
                  transform: [
                    { scale: starsScale },
                    {
                      rotate: starsRotate.interpolate({
                        inputRange: [0, 360],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                  opacity: starsOpacity,
                },
              ]}
            >
              <MaterialCommunityIcons name="shimmer" size={40} color="#FFD700" style={styles.starIcon} />
            </Animated.View>
          );
        })}

        {/* BANG explosion */}
        <Animated.View
          style={[
            styles.bangContainer,
            {
              transform: [{ scale: burstScale }],
              opacity: burstOpacity,
            },
          ]}
        >
          <MaterialCommunityIcons name="creation" size={80} color="#FFA500" style={styles.bangIcon} />
        </Animated.View>

        {/* Confetti particles */}
        {Array.from({ length: 30 }).map((_, index) => {
          const randomX = (Math.random() - 0.5) * SCREEN_WIDTH * 0.8 + CENTER_X;
          const randomDelay = Math.random() * 200;
          const randomRotation = Math.random() * 720;
          const confettiColors = ['#FF3E9E', '#FDC700', '#4CA0E8', '#FF6B6B', '#4ECDC4', '#95E1D3'];
          const color = confettiColors[index % confettiColors.length];
          const confettiIcons = ['circle', 'square', 'triangle', 'star'];
          const icon = confettiIcons[index % confettiIcons.length];

          return (
            <Animated.View
              key={`confetti-${index}`}
              style={[
                styles.confetti,
                {
                  left: randomX,
                  top: CENTER_Y - 100,
                  transform: [
                    {
                      translateY: confettiY.interpolate({
                        inputRange: [0, SCREEN_HEIGHT],
                        outputRange: [0, SCREEN_HEIGHT + 100],
                      }),
                    },
                    {
                      rotate: confettiY.interpolate({
                        inputRange: [0, SCREEN_HEIGHT],
                        outputRange: ['0deg', `${randomRotation}deg`],
                      }),
                    },
                  ],
                  opacity: confettiOpacity,
                },
              ]}
            >
              <MaterialCommunityIcons name={icon as any} size={20} color={color} />
            </Animated.View>
          );
        })}

        {/* Hybrid Result */}
        <Animated.View
          style={[
            styles.hybridContainer,
            {
              transform: [
                { translateY: hybridY },
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
    top: 0,
    left: 0,
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
  burstEffect: {
    position: "absolute",
    left: CENTER_X - 60,
    top: CENTER_Y - 60,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFD700",
    shadowColor: "#FFA500",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  star: {
    position: "absolute",
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  starIcon: {
    textShadowColor: "#FFD700",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  bangContainer: {
    position: "absolute",
    left: CENTER_X - 40,
    top: CENTER_Y - 40,
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  bangIcon: {
    textShadowColor: "#FFA500",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  confetti: {
    position: "absolute",
    width: 20,
    height: 20,
  },
});
