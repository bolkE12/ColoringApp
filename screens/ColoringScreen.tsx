import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  Dimensions,
  Platform,
  StatusBar as RNStatusBar,
  LayoutChangeEvent,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { ArrowLeft, Droplet, Brush, RotateCcw, Trash2, Save, Palette, PawPrint, Sparkles } from "lucide-react-native";
import { useFonts, MadimiOne_400Regular } from "@expo-google-fonts/madimi-one";
import { LinearGradient } from "expo-linear-gradient";
import GlColoringCanvas, { GlColoringCanvasRef } from "./GlColoringCanvas";
import { saveAnimal } from "../src/utils/savedAnimals";
import { generateSillyName } from "../src/utils/nameGenerator";

// Types for route params (adjust to your navigator's typing as needed)
type ColoringParams = {
  animalName?: string; // e.g., "Lion"
  hybridKey?: string;  // e.g., "bear_fox"
  // You can also pass a React component (SVG) for the drawing:
  // Icon?: React.ComponentType<any>;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#FFD93D', '#6BCF7F', '#B388FF', '#FF80AB', '#A5D6A7',
  '#FFB74D', '#64B5F6', '#F06292', '#81C784', '#FFD54F',
  '#9575CD', '#4DB6AC', '#FF8A65', '#BA68C8', '#7986CB',
];

export default function ColoringScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, ColoringParams>, string>>();
  const { animalName = "Lion", hybridKey } = route.params ?? {};

  const [fontsLoaded] = useFonts({ MadimiOne_400Regular });
  const [activeTool, setActiveTool] = useState<"fill" | "brush">("fill");
  const [activeColor, setActiveColor] = useState<string>(DEFAULT_COLORS[0]);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [generatedName] = useState(() => generateSillyName());
  const canvasRef = useRef<GlColoringCanvasRef>(null);

  if (!fontsLoaded) return null;

  return (
    <ImageBackground
      source={require("../assets/background.png")}
      resizeMode="cover"
      style={styles.bg}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <ArrowLeft color="#111" size={18} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.screenTitle}>Meet {generatedName}!</Text>
          <View style={{ width: 72 }} />{/* spacer to balance back button */}
        </View>

        {/* Main layout */}
        <View style={styles.main}>
          {/* Canvas - Displays the hybrid PNG chosen from CreateScreen
              The hybridKey is passed via navigation params and loaded by GlColoringCanvas */}
          <View style={styles.canvasWrap}>
            <View
              style={styles.canvas}
              onLayout={(e: LayoutChangeEvent) => {
                const { width, height } = e.nativeEvent.layout;
                setCanvasSize({ width, height });
              }}
            >
              {hybridKey ? (
                <GlColoringCanvas
                  ref={canvasRef}
                  hybridKey={hybridKey}
                  selectedColor={activeColor}
                  width="100%"
                  height="100%"
                />
              ) : (
                <Text style={styles.canvasPlaceholder}>Your animal will appear here</Text>
              )}
            </View>
          </View>

          {/* Right Panel */}
          <View style={[styles.panel, canvasSize?.height ? { height: canvasSize.height } : null]}>
            <View style={[styles.panelHeaderContainer]}>
              <View style={styles.panelHeader}>
                <Palette size={24} color="#111" />
                <Text style={styles.panelTitle}>Colors</Text>
              </View>
            </View>

            {/* Tool Switch */}
            <View style={styles.toolRow}>
              <Pressable
                onPress={() => setActiveTool("fill")}
                style={[styles.toolBtn, activeTool === "fill" && styles.toolBtnActive]}
              >
                <Droplet size={16} color={activeTool === "fill" ? "#fff" : "#333"} />
                <Text style={[styles.toolText, activeTool === "fill" && styles.toolTextActive]}>
                  Fill
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTool("brush")}
                style={[styles.toolBtn, activeTool === "brush" && styles.toolBtnActive]}
              >
                <Brush size={16} color={activeTool === "brush" ? "#fff" : "#333"} />
                <Text style={[styles.toolText, activeTool === "brush" && styles.toolTextActive]}>
                  Brush
                </Text>
              </Pressable>
            </View>

            {/* Palette */}
            <View style={styles.palette}>
              {DEFAULT_COLORS.map((c) => {
                const selected = c === activeColor;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setActiveColor(c)}
                    style={[styles.swatch, { backgroundColor: c }, selected && styles.swatchActive]}
                  />
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.row}>
              <Pressable
                onPress={() => {
                  canvasRef.current?.undo();
                }}
                style={styles.ghostBtn}
              >
                <RotateCcw size={16} color="#333" />
                <Text style={styles.ghostText}>Undo</Text>
              </Pressable>
            </View>
            <View style={styles.row}>
              <Pressable
                onPress={() => {
                  canvasRef.current?.clear();
                }}
                style={styles.ghostBtn}
              >
                <Trash2 size={16} color="#333" />
                <Text style={styles.ghostText}>Clear All</Text>
              </Pressable>
            </View>

            {/* Save */}
            <LinearGradient
              colors={["#00C950", "#00BC7D"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtn}
            >
              <Pressable
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                onPress={async () => {
                  try {
                    const imageUri = await canvasRef.current?.save();
                    if (imageUri && hybridKey) {
                      await saveAnimal(hybridKey, generatedName, imageUri);
                      setHasSaved(true);
                      setShowSuccessModal(true);
                    }
                  } catch (error) {
                    console.error("Save error:", error);
                    Alert.alert("Oops!", "Something went wrong. Please try again.");
                  }
                }}
              >
                <Save size={18} color="#fff" />
                <Text style={styles.saveText}>Save to Pen</Text>
              </Pressable>
            </LinearGradient>

            {/* View Animal Pen - Only show after saving */}
            {hasSaved && (
              <View style={styles.row}>
                <Pressable
                  onPress={() => {
                    navigation.navigate("Pen" as never);
                  }}
                  style={styles.ghostBtn}
                >
                  <PawPrint size={16} color="#333" />
                  <Text style={styles.ghostText}>View My Animal Pen</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Custom Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Sparkles size={64} color="#FFD93D" style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Amazing Work!</Text>
            <Text style={styles.modalMessage}>
              {generatedName} has been saved to your Animal Pen! 🎨
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonText}>Awesome!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const PANEL_WIDTH = 256;

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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  backText: {
    fontFamily: "MadimiOne_400Regular",
    color: "#111",
    fontSize: 16,
  },
  screenTitle: {
    fontFamily: "MadimiOne_400Regular",
    color: "#fff",
    fontSize: 24,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasWrap: {
    flex: 1,
    paddingRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  canvasPlaceholder: {
    fontFamily: "MadimiOne_400Regular",
    color: "#999",
    fontSize: 16,
  },
  panel: {
    width: PANEL_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
    gap: 12,
    flexShrink: 0,
  },
  panelTitle: {
    fontFamily: "MadimiOne_400Regular",
    color: "#111",
    fontSize: 24,
    marginBottom: 6,
    marginTop: 4,
  },
  toolRow: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "stretch",
    width: "100%",
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eee",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
  },
  toolBtnActive: {
    backgroundColor: "#A133F5",
  },
  toolBtnActiveLight: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toolText: {
    fontFamily: "MadimiOne_400Regular",
    color: "#333",
    fontSize: 14,
  },
  toolTextActive: {
    color: "#fff",
  },
  toolTextDark: {
    color: "#111",
  },
  palette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    marginBlock: 8,
    alignSelf: "stretch",
    width: "100%",
    justifyContent: "space-between",
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: "#111",
  },
  row: {
    marginTop: 2,
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#999",
    justifyContent: "center",
    textAlign: "center",
  },
  ghostText: {
    fontFamily: "MadimiOne_400Regular",
    color: "#333",
    fontSize: 14,
  },
  saveBtn: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  saveText: {
    fontFamily: "MadimiOne_400Regular",
    color: "#fff",
    fontSize: 16,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  panelHeaderContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: "MadimiOne_400Regular",
    fontSize: 32,
    color: "#FF3E9E",
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    fontFamily: "MadimiOne_400Regular",
    fontSize: 18,
    color: "#333",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: "#FF3E9E",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalButtonText: {
    fontFamily: "MadimiOne_400Regular",
    fontSize: 18,
    color: "#fff",
  },
});