// screens/CreateScreen.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
  Platform,
  StatusBar as RNStatusBar,
  LayoutAnimation,
  UIManager,
  Animated,
  Easing,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts, MadimiOne_400Regular } from "@expo-google-fonts/madimi-one";
import { LinearGradient } from "expo-linear-gradient";
import { MusicToggle } from "../src/components/MusicToggle";
import { HybridAnimationOverlay } from "../src/components/HybridAnimationOverlay";

// PNG requires for base animals
const LION = require("../assets/base/lion.png");
const TIGER = require("../assets/base/tiger.png");
const MONKEY = require("../assets/base/monkey.png");
const ZEBRA = require("../assets/base/zebra.png");
const FOX = require("../assets/base/fox.png");
const PENGUIN = require("../assets/base/penguin.png");
const HIPPO = require("../assets/base/hippo.png");
const TURTLE = require("../assets/base/turtle.png");
const BEAR = require("../assets/base/bear.png");
const BUNNY = require("../assets/base/bunny.png");
const GIRAFFE = require("../assets/base/giraffe.png");
const ELEPHANT = require("../assets/base/elephant.png");

// tweak these if you want bigger/smaller tiles
const TILE_RADIUS = 20;
const GRID_GAP = 18;

type ImageSourceType = number;

const ANIMALS: { id: string; source: ImageSourceType }[] = [
  { id: "lion", source: LION },
  { id: "tiger", source: TIGER },
  { id: "monkey", source: MONKEY },
  { id: "zebra", source: ZEBRA },
  { id: "fox", source: FOX },
  { id: "penguin", source: PENGUIN },
  { id: "hippo", source: HIPPO },
  { id: "turtle", source: TURTLE },
  { id: "bear", source: BEAR },
  { id: "bunny", source: BUNNY },
  { id: "giraffe", source: GIRAFFE },
  { id: "elephant", source: ELEPHANT },
];

const IMAGE_BY_ID: Record<string, ImageSourceType> = ANIMALS.reduce((acc, a) => {
  acc[a.id] = a.source;
  return acc;
}, {} as Record<string, ImageSourceType>);


// Build a deterministic hybrid key from two base animals (alphabetized)
function makeHybridKey(a?: string, b?: string): string {
  if (!a || !b) return "";
  const [x, y] = [a, b].sort();
  return `${x}_${y}`;
}

// Render PNG image
function AnimalImage({
  source,
  testID,
}: {
  source: ImageSourceType;
  testID?: string;
}) {
  return (
    <Image
      source={source}
      style={{ width: "85%", height: "85%", borderRadius: 12 }}
      resizeMode="contain"
      testID={testID}
    />
  );
}


export default function CreateScreen() {
  const navigation = useNavigation<any>();

  // Track dimensions for responsive layout
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const isPortrait = dimensions.height > dimensions.width;
  const numColumns = isPortrait ? 4 : 6;

  const [fontsLoaded] = useFonts({
    MadimiOne_400Regular,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{
    animalName: string;
    hybridKey?: string;
    baseAnimalKey?: string;
  } | null>(null);

  // Update dimensions on screen rotation
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);
  React.useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);
  const rotateAnim = React.useRef(new Animated.Value(-1)).current;

  React.useEffect(() => {
    const loopAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: false }
    );
    loopAnimation.start();
    return () => loopAnimation.stop();
  }, [rotateAnim]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-2deg", "2deg"],
  });

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    if (pendingNavigation) {
      // @ts-ignore
      navigation.navigate("Coloring", pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const toggleSelect = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[0], id]; // keep max 2; replace second
      return [...prev, id];
    });
  };
  const PrimaryEnabled = selected.length >= 1;
  const TwoSelected = selected.length === 2;
  const renderAnimalIcon = (id?: string) => {
    if (!id) return null;
    const src = IMAGE_BY_ID[id];
    return <AnimalImage source={src} />;
  };

  if (!fontsLoaded) return null;

  return (
    <ImageBackground
      source={require("../assets/background.png")}
      resizeMode="cover"
      style={styles.bg}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <MaterialCommunityIcons name="arrow-left" color="#111" size={18} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={{ marginTop: 4 }}>
            <MusicToggle />
          </View>
        </View>

        <View style={styles.container}>
          {/* Title */}
          <Text style={styles.title}>Pick 1 or 2 Animals to Mix!</Text>

          {/* Selection area */}
          {selected.length === 0 ? (
            <View style={styles.selector}>
              <MaterialCommunityIcons name="help-circle" color="#111" size={40} />
              <Text style={styles.selectorLabel}>Pick animal(s)</Text>
            </View>
          ) : (
            <View style={styles.slotsRow}>
              {/* Slot 1 */}
              <View style={[styles.slotBox, styles.slotBoxFilled]}>
                {selected[0] ? (
                  <View style={styles.slotContent}>
                    {renderAnimalIcon(selected[0])}
                  </View>
                ) : (
                  <View style={styles.slotPlaceholder} />
                )}
              </View>
              {/* Slot 2 (optional) */}
              {selected[1] ? (
                <View style={[styles.slotBox, styles.slotBoxFilled]}>
                  <View style={styles.slotContent}>
                    {renderAnimalIcon(selected[1])}
                  </View>
                </View>
              ) : (
                <View style={[styles.slotBox, styles.slotOptional]}>
                  <View style={styles.slotQuestion}>
                    <MaterialCommunityIcons name="help-circle" color="#111" size={40} />
                    <Text style={styles.slotOptionalText}>Optional</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Primary CTA */}
          <View style={styles.primarySpacer}>
            {PrimaryEnabled && (
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    if (TwoSelected) {
                      // Hybrid: two animals selected - trigger animation
                      const key = makeHybridKey(selected[0], selected[1]);
                      const displayName = selected.map((s) => s[0].toUpperCase() + s.slice(1)).join(" + ");
                      setPendingNavigation({ animalName: displayName, hybridKey: key });
                      setShowAnimation(true);
                    } else {
                      // Single animal: only one selected - navigate directly (no animation)
                      const animalKey = selected[0];
                      const displayName = animalKey[0].toUpperCase() + animalKey.slice(1);
                      // @ts-ignore
                      navigation.navigate("Coloring", { animalName: displayName, baseAnimalKey: animalKey });
                    }
                  }}
                >
                  <MaterialCommunityIcons name="plus" color="#fff" size={18} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryText}>
                    {TwoSelected ? "Create My Hybrid!" : "Color My Animal!"}
                  </Text>
                </Pressable>
              </Animated.View>
            )}
          </View>

          {/* Grid */}
          <FlatList
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: GRID_GAP }}
            data={ANIMALS}
            numColumns={numColumns}
            key={numColumns}
            keyExtractor={(item) => item.id}
            extraData={selected}
            renderItem={({ item }) => {
              const isSelected = selected.includes(item.id);
              const tileWidth = (dimensions.width - GRID_GAP * (numColumns - 1) - 48) / numColumns;
              return (
                <View style={[styles.tileShell, { width: tileWidth }]}>
                  {isSelected && (
                    <LinearGradient
                      colors={["#C27AFF", "#FB64B6"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.tileBg}
                    />
                  )}
                  <Pressable
                    onPress={() => toggleSelect(item.id)}
                    style={[styles.tile, isSelected && styles.tileSelected]}
                    android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                  >
                    <View style={styles.tileInner}>
                      <AnimalImage source={item.source} />
                    </View>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <MaterialCommunityIcons name="check-bold" color="#111" size={14} />
                      </View>
                    )}
                  </Pressable>
                </View>
              );
            }}
          />
        </View>
      </SafeAreaView>

      {/* Hybrid Animation Overlay */}
      {showAnimation && pendingNavigation?.hybridKey && (
        <HybridAnimationOverlay
          visible={showAnimation}
          animal1={selected[0]}
          animal2={selected[1]}
          hybridKey={pendingNavigation.hybridKey}
          onComplete={handleAnimationComplete}
        />
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#4CA0E8",
  },
  safe: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight ?? 0 : 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    alignSelf: "flex-start",
  },
  backText: {
    fontFamily: "MadimiOne_400Regular",
    color: "#111",
    fontSize: 16,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: "MadimiOne_400Regular",
    color: "#fff",
    fontSize: 40, // looks close to your mock; bump to 44–48 if you want bigger
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  slotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 16,
  },
  selector: {
    width: 160,
    height: 160,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#111",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  selectorLabel: {
    marginTop: 6,
    fontFamily: "MadimiOne_400Regular",
    color: "#111",
    fontSize: 14,
  },
  slotBox: {
    width: 160,
    height: 160,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,1)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  slotBoxFilled: {},
  slotContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  slotPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  slotOptional: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "#111",
    borderStyle: "dashed",
  },
  slotQuestion: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  slotOptionalText: {
    fontFamily: "MadimiOne_400Regular",
    color: "#111",
    fontSize: 14,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3E9E",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginBottom: 12,
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "MadimiOne_400Regular",
  },
  grid: {
    paddingTop: 6,
    paddingBottom: 24,
    gap: GRID_GAP,
    alignItems: "center",
    justifyContent: "center",
  },
  tileShell: {
    aspectRatio: 1,
    borderRadius: TILE_RADIUS,
    overflow: "visible",
    backgroundColor: "#fff",
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  tileBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TILE_RADIUS,
  },
  tile: {
    flex: 1,
    borderRadius: TILE_RADIUS,
    backgroundColor: "transparent",
  },
  tileSelected: {
    backgroundColor: "transparent",
  },
  tileInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  checkBadge: {
    position: "absolute",
    left: -6,
    top: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FDC700",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 2,
  },
  primarySpacer: {
    height: 64, // roughly matches button height + margin
    justifyContent: "center",
    alignItems: "center",
  },
});