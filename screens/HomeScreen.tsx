import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  ImageBackground,
  View,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  Animated,
  Easing,
  ViewStyle,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts, MadimiOne_400Regular } from "@expo-google-fonts/madimi-one";
import { Plus, PawPrint } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { getBaseRequire } from "../assets/base";
import { HYBRID_SOURCES } from "../assets/hybrid";

const ANIMALS = ["bear","bunny","elephant","fox","giraffe","hippo","lion","monkey","penguin","tiger","turtle","zebra"] as const;
type Animal = typeof ANIMALS[number];


const HAS_HYBRID = new Set<string>(Object.keys(HYBRID_SOURCES ?? {}));
const ALL_HYBRID_KEYS = Object.keys(HYBRID_SOURCES ?? {});

function pickRandomPair(): [Animal, Animal] {
  if (!ALL_HYBRID_KEYS.length) return ["monkey", "zebra"] as [Animal, Animal];
  const key = ALL_HYBRID_KEYS[Math.floor(Math.random() * ALL_HYBRID_KEYS.length)];
  const [a, b] = key.split("_") as [Animal, Animal];
  // Randomize which side each base animal appears on
  return Math.random() < 0.5 ? [a, b] : [b, a];
}


const NEXT = (a: Animal, step: number = 1) =>
  ANIMALS[(ANIMALS.indexOf(a) + step) % ANIMALS.length];

const fade = (val: Animated.Value, to: number, duration = 220) =>
  Animated.timing(val, { toValue: to, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });

type RootStackParamList = {
  Home: undefined;
  Create: undefined;
  Coloring?: { hybridKey: string; animalName: string };
};

function hybridKey(a: Animal, b: Animal) {
  const [x, y] = [a, b].sort();
  return `${x}_${y}`;
}


export default function App() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const initialPair = useRef<[Animal, Animal]>(pickRandomPair()).current;
  const [leftAnimal, setLeftAnimal] = useState<Animal>(initialPair[0]);
  const [rightAnimal, setRightAnimal] = useState<Animal>(initialPair[1]);
  const hk = hybridKey(leftAnimal, rightAnimal);

  const [fontsLoaded] = useFonts({
    MadimiOne_400Regular,
  });

  const leftAnim = useRef(new Animated.Value(0)).current;
  const centerAnim = useRef(new Animated.Value(0)).current;
  const rightAnim = useRef(new Animated.Value(0)).current;
  const rock = useRef(new Animated.Value(0)).current;  // for back-and-forth rotation (0→1→0)
  const breath = useRef(new Animated.Value(0)).current; // for subtle scale pulse (0→1→0)

  // Swap anims for boxes (1 → 0 fade/scale out, then 0 → 1 in)
  const leftSwap = useRef(new Animated.Value(1)).current;
  const centerSwap = useRef(new Animated.Value(1)).current; // center: 270px ↔ 90px
  const rightSwap = useRef(new Animated.Value(1)).current;
  const swapping = useRef(false);

  // Map swap value to desired opacity + scale.
  // `minScale` is collapsed / expanded ratio (e.g., left/right 40/160 = 0.25, center 90/270 ≈ 0.3333).
  const makeSwapStyle = (val: Animated.Value, minScale: number = 0.25) => ({
    opacity: val,
    transform: [
      {
        scale: val.interpolate({
          inputRange: [0, 1],
          outputRange: [minScale, 1],
        }),
      },
    ],
  });

  const animateSideSwap = (
    val: Animated.Value,
    setAnimalFn: (a: Animal) => void,
    nextAnimal: Animal,
    onDone?: () => void
  ) => {
    Animated.timing(val, {
      toValue: 0,
      duration: 600,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setAnimalFn(nextAnimal);
      val.setValue(0);
      Animated.timing(val, {
        toValue: 1,
        duration: 600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(() => onDone && onDone());
    });
  };

function cyclePair() {
  if (swapping.current) return;
  swapping.current = true;

  // Start fading/shrinking center immediately (270px → 90px; opacity 1 → 0)
  Animated.timing(centerSwap, {
    toValue: 0,
    duration: 600,
    easing: Easing.inOut(Easing.quad),
    useNativeDriver: true,
  }).start();

  const [a, b] = pickRandomPair();
  let doneCount = 0;
  const done = () => {
    doneCount += 1;
    if (doneCount === 2) {
      // Bases are swapped; bring center back in (90px → 270px; opacity 0 → 1)
      Animated.timing(centerSwap, {
        toValue: 1,
        duration: 600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        swapping.current = false;
      });
    }
  };

  animateSideSwap(leftSwap, setLeftAnimal, a, done);
  animateSideSwap(rightSwap, setRightAnimal, b, done);
}

  useEffect(() => {
    if (!fontsLoaded) return;

    const leftIn = Animated.timing(leftAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    const centerIn = Animated.spring(centerAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    });

    const rightIn = Animated.timing(rightAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    Animated.stagger(120, [leftIn, centerIn, rightIn]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(rock, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(rock, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        { resetBeforeIteration: false }
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(breath, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breath, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        { resetBeforeIteration: false }
      ).start();
    });
  }, [fontsLoaded, leftAnim, centerAnim, rightAnim, rock, breath]);

  useEffect(() => {
  if (!fontsLoaded) return;

  const id = setInterval(() => {
    cyclePair();
  }, 5000);

  return () => clearInterval(id);
}, [fontsLoaded, leftAnimal, rightAnimal]);

  const HybridPreview = ({ size = 160 }: { size?: number }) => {
    const boxStyle: ViewStyle = { width: size, height: size };
    const hybridSource = HYBRID_SOURCES[hk];
    return (
      <View style={[boxStyle]}>
        {hybridSource ? (
          <Image
            source={hybridSource}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
            <Text style={{ color: "#333" }}>Loading…</Text>
          </View>
        )}
      </View>
    );
  };

  const BasePreview = ({
    animal,
    size = 120,
  }: {
    animal: Animal;
    size?: number;
  }) => {
    const boxStyle: ViewStyle = { width: size, height: size };
    const source = getBaseRequire(animal);
    return (
      <View style={boxStyle}>
        {source ? (
          <Image
            source={source}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff" }}>{animal.toUpperCase()}</Text>
          </View>
        )}
      </View>
    );
  };

  const leftStyle = {
    opacity: leftAnim,
    transform: [
      {
        translateX: leftAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, 0],
        }),
      },
      {
        scale: leftAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
      {
        rotate: rock.interpolate({
          inputRange: [0, 1],
          outputRange: ["-3deg", "3deg"],
        }),
      },
      {
        scale: breath.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1.015],
        }),
      },
    ],
  };

  const centerStyle = {
    transform: [
      {
        scale: centerAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
        }),
      },
      {
        rotate: rock.interpolate({
          inputRange: [0, 1],
          outputRange: ["-3deg", "3deg"],
        }),
      },
      {
        scale: breath.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1.015],
        }),
      },
    ],
  };

  const rightStyle = {
    opacity: rightAnim,
    transform: [
      {
        translateX: rightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [40, 0],
        }),
      },
      {
        scale: rightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
      {
        rotate: rock.interpolate({
          inputRange: [0, 1],
          outputRange: ["-3deg", "3deg"],
        }),
      },
      {
        scale: breath.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1.015],
        }),
      },
    ],
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ImageBackground
      source={require("../assets/background.png")}
      resizeMode="cover"
      style={styles.bg}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          {/* Headline */}
          <Text style={styles.title}>Create &amp; Color Your Own Animal</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Mix two animals together and create amazing hybrid creatures to color!
          </Text>

          {/* Three gradient boxes */}
          <View style={styles.boxRow}>
            {/* Left base animal */}
            <Animated.View style={[styles.box, leftStyle]}>
              <Pressable
                style={styles.baseBox}
                onPress={() => {
                  const idx = ANIMALS.indexOf(leftAnimal);
                  let next = ANIMALS[(idx + 1) % ANIMALS.length];
                  if (next === rightAnimal) {
                    next = ANIMALS[(idx + 2) % ANIMALS.length];
                  }
                  animateSideSwap(leftSwap, setLeftAnimal, next);
                }}
              >
                <Animated.View style={makeSwapStyle(leftSwap)}>
                  <BasePreview animal={leftAnimal} size={120} />
                </Animated.View>
              </Pressable>
            </Animated.View>

            <Text style={styles.arrow}>→</Text>

            {/* Center hybrid preview (Skia) */}
            <Animated.View style={[styles.box, styles.mainBox, centerStyle]}>
              <View style={styles.hybridWrap}>
                <Animated.View style={makeSwapStyle(centerSwap, 0.3333)}>
                  <HybridPreview size={270} />
                </Animated.View>
              </View>
            </Animated.View>

            <Text style={styles.arrow}>←</Text>

            {/* Right base animal */}
            <Animated.View style={[styles.box, rightStyle]}>
              <Pressable
                style={styles.baseBox}
                onPress={() => {
                  const idx = ANIMALS.indexOf(rightAnimal);
                  let next = ANIMALS[(idx + 1) % ANIMALS.length];
                  if (next === leftAnimal) next = ANIMALS[(idx + 2) % ANIMALS.length];
                  animateSideSwap(rightSwap, setRightAnimal, next);
                }}
              >
                <Animated.View style={makeSwapStyle(rightSwap)}>
                  <BasePreview animal={rightAnimal} size={120} />
                </Animated.View>
              </Pressable>
            </Animated.View>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("Create")}>
              <Plus color="#fff" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.primaryText}>
                Create and Color Your Own Animal!
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("Pen")}>
              <PawPrint color="#333" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.secondaryText}>My Animal Pen</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const BUTTON_WIDTH = 400;

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#4CA0E8",
  },
  safe: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) : 0,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: "MadimiOne_400Regular",
    fontSize: 72,
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    lineHeight: 72 * 1.05,
  },
  subtitle: {
    fontFamily: "MadimiOne_400Regular",
    color: "#fff",
    textAlign: "center",
    fontSize: 28,
    marginTop: 16,
    marginBottom: 60,
    paddingHorizontal: 20,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  boxRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 60,
  },
  box: {
    width: 160,
    height: 160,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.4)",
  },
  mainBox: {
    width: 282,
    height: 282,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.4)",
    marginHorizontal: 0,
    overflow: "hidden",
  },
  baseBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,1)",
    borderRadius: 12,
  },
  baseLabel: {
    marginTop: 6,
    fontFamily: "MadimiOne_400Regular",
    color: "#fff",
    fontSize: 14,
    opacity: 0.9,
  },
  hybridWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  hybridBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hybridText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "MadimiOne_400Regular",
  },
  arrow: {
    fontSize: 40,
    color: "#fff",
    marginHorizontal: 16,
  },
  buttons: {
    alignItems: "center",
    gap: 16,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3E9E",
    borderRadius: 12,
    width: BUTTON_WIDTH,
    paddingVertical: 20,
    // Drop shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "MadimiOne_400Regular",
    textAlign: "center",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    width: BUTTON_WIDTH,
    paddingVertical: 20,
    // Drop shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryText: {
    color: "#333",
    fontSize: 20,
    fontFamily: "MadimiOne_400Regular",
    textAlign: "center",
  },
  boxFill: {
    flex: 1,
    borderRadius: 16,
  },
  centerFill: {
    flex: 1,
    borderRadius: 0,
  },
});