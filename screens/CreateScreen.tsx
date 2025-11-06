// screens/CreateScreen.tsx
import React, { useMemo, useState } from "react";
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
import { ArrowLeft, HelpCircle, Plus, Check } from "lucide-react-native";
import { useFonts, MadimiOne_400Regular } from "@expo-google-fonts/madimi-one";
import type { SvgProps } from "react-native-svg";

import { LinearGradient } from "expo-linear-gradient";

import { SvgUri } from "react-native-svg";
import { Asset } from "expo-asset";

import Lion from "../assets/base/lion.svg";
import Tiger from "../assets/base/tiger.svg";
import Monkey from "../assets/base/monkey.svg";
import Zebra from "../assets/base/zebra.svg";
import Fox from "../assets/base/fox.svg";
import Penguin from "../assets/base/penguin.svg";
import Hippo from "../assets/base/hippo.svg";
import Turtle from "../assets/base/turtle.svg";
import Bear from "../assets/base/bear.svg";
import Bunny from "../assets/base/bunny.svg";
import Giraffe from "../assets/base/giraffe.svg";
import Elephant from "../assets/base/elephant.svg";

const { width } = Dimensions.get("window");

// tweak these if you want bigger/smaller tiles
const TILE_SIZE = 132;
const TILE_RADIUS = 20;
const GRID_GAP = 18;

type IconType = React.ComponentType<SvgProps>;

const ANIMALS: { id: string; Icon: IconType }[] = [
  { id: "lion", Icon: Lion },
  { id: "tiger", Icon: Tiger },
  { id: "monkey", Icon: Monkey },
  { id: "zebra", Icon: Zebra },
  { id: "fox", Icon: Fox },
  { id: "penguin", Icon: Penguin },
  { id: "hippo", Icon: Hippo },
  { id: "turtle", Icon: Turtle },
  { id: "bear", Icon: Bear },
  { id: "bunny", Icon: Bunny },
  { id: "giraffe", Icon: Giraffe },
  { id: "elephant", Icon: Elephant },
];

const ICON_BY_ID: Record<string, IconType> = ANIMALS.reduce((acc, a) => {
  acc[a.id] = a.Icon as any;
  return acc;
}, {} as Record<string, IconType>);


// Build a deterministic hybrid key from two base animals (alphabetized)
function makeHybridKey(a?: string, b?: string): string {
  if (!a || !b) return "";
  const [x, y] = [a, b].sort();
  return `${x}_${y}`;
}

// Some environments may return a numeric module ID instead of a React component
// if the svg transformer isn't engaged. Guard against that at runtime so we don't
// try to render a number as a component (which crashes FlatList's CellRenderer).
function isValidIcon(x: any): x is IconType {
  return typeof x === "function" || (typeof x === "object" && x != null && "render" in x);
}

function MaybeSvg({
  source,
  sizePct = "85%",
  testID,
}: {
  source: any;
  sizePct?: string;
  testID?: string;
}) {
  // Case 1: Valid React component from svg-transformer
  if (isValidIcon(source)) {
    const Cmp = source as IconType;
    return <Cmp width={sizePct} height={sizePct} preserveAspectRatio="xMidYMid meet" testID={testID} />;
  }

  // Case 2: Metro returned a numeric module id; resolve to a URI and render via SvgUri
  if (typeof source === "number") {
    try {
      const asset = Asset.fromModule(source);
      // Ensure the asset is available (in dev it may need downloading)
      if (!asset.downloaded) {
        // Fire-and-forget; SvgUri will update when uri is ready because asset.uri is stable after resolve
        asset.downloadAsync?.().catch(() => {});
      }
      const uri = asset.localUri ?? asset.uri;
      if (uri) {
        return <SvgUri width={sizePct} height={sizePct} uri={uri} />;
      }
    } catch {
      // fall through to empty render
    }
  }

  // Unknown/unsupported shape — render nothing to avoid crashes
  return null;
}


export default function CreateScreen() {
  const navigation = useNavigation<any>();

  const [fontsLoaded] = useFonts({
    MadimiOne_400Regular,
  });
  const [selected, setSelected] = useState<string[]>([]);
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
  const renderAnimalIcon = (id?: string, sizePct: string = "78%") => {
    if (!id) return null;
    const src = ICON_BY_ID[id] as any;
    return <MaybeSvg source={src} sizePct={sizePct} />;
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
            <ArrowLeft color="#111" size={18} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.container}>
          {/* Title */}
          <Text style={styles.title}>Pick 1 or 2 Animals to Mix!</Text>

          {/* Selection area */}
          {selected.length === 0 ? (
            <View style={styles.selector}>
              <HelpCircle color="#111" size={40} />
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
                    <HelpCircle color="#111" size={40} />
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
                {/* Build a deterministic key (alphabetical) like "bear_fox" so it matches /assets/hybrid/bear_fox.svg */}
                <Pressable
                  style={[styles.primaryBtn, !TwoSelected && { opacity: 0.6 }]}
                  disabled={!TwoSelected}
                  onPress={() => {
                    const key = makeHybridKey(selected[0], selected[1]);
                    const displayName = selected.map((s) => s[0].toUpperCase() + s.slice(1)).join(" + ");
                    // @ts-ignore
                    navigation.navigate("Coloring", { animalName: displayName, hybridKey: key });
                  }}
                >
                  <Plus color="#fff" size={18} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryText}>Create My Animal!</Text>
                </Pressable>
              </Animated.View>
            )}
          </View>

          {/* Grid */}
          <FlatList
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: GRID_GAP }}
            data={ANIMALS}
            numColumns={6}
            keyExtractor={(item) => item.id}
            extraData={selected}
            renderItem={({ item }) => {
              const Icon: IconType | undefined = item.Icon as IconType | undefined;
              const isSelected = selected.includes(item.id);
              return (
                <View style={styles.tileShell}>
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
                      <MaybeSvg source={ICON_BY_ID[item.id]} sizePct="85%" />
                    </View>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Check color="#111" size={14} />
                      </View>
                    )}
                  </Pressable>
                </View>
              );
            }}
          />
        </View>
      </SafeAreaView>
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
    backgroundColor: "rgba(255,255,255,0.85)",
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
    width: (width - GRID_GAP * 5 - 48) / 6,
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