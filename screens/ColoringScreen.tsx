import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar as RNStatusBar,
  LayoutChangeEvent,
  Alert,
  Modal,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { ArrowLeft, Droplet, Brush, RotateCcw, Trash2, Save, Palette, PawPrint, Sparkles, ThumbsUp, Volume2, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useFonts, MadimiOne_400Regular } from "@expo-google-fonts/madimi-one";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from 'expo-speech';
import GlColoringCanvas, { GlColoringCanvasRef } from "./GlColoringCanvas";
import { saveAnimal, updateAnimal } from "../src/utils/savedAnimals";
import { generateSillyName } from "../src/utils/nameGenerator";
import { MusicToggle } from "../src/components/MusicToggle";

// Import the correct navigation types
import type { RootStackParamList } from "../navigation/AppNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#FFD93D', '#6BCF7F', '#B388FF', '#FF80AB', '#A5D6A7',
  '#FFB74D', '#64B5F6', '#F06292', '#81C784', '#A98052',
  '#9575CD', '#4DB6AC', '#FF8A65', '#BA68C8', '#7986CB',
];

// Memoized color swatch - only re-renders when its own selection state changes
const ColorSwatch = React.memo(({
  color,
  isSelected,
  onSelect,
  swatchStyle
}: {
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  swatchStyle?: any;
}) => {
  console.log('[ColorSwatch] Rendering:', color, 'selected:', isSelected);
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onSelect}
      style={[
        styles.swatch,
        swatchStyle,
        { backgroundColor: color },
        isSelected && styles.swatchActive
      ]}
    />
  );
}, (prev, next) => {
  // Only re-render if selection state changes for this specific swatch
  return prev.isSelected === next.isSelected && prev.color === next.color;
});

export default function ColoringScreen() {
  console.log('[ColoringScreen] Rendering...');
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Coloring">>();
  const {
    animalName = "Lion",
    hybridKey,
    baseAnimalKey,
    savedAnimalId: initialSavedAnimalId,
    existingImageUri: initialExistingImageUri
  } = route.params ?? {};

  const [fontsLoaded] = useFonts({ MadimiOne_400Regular });
  const [activeTool, setActiveTool] = useState<"fill" | "brush">("fill");
  const [activeColor, setActiveColor] = useState<string>(DEFAULT_COLORS[0]);
  const [brushWidth, setBrushWidth] = useState<number>(8); // Brush width in pixels
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasSaved, setHasSaved] = useState(!!initialSavedAnimalId); // Already saved if editing
  const [savedAnimalId, setSavedAnimalId] = useState<string | null>(initialSavedAnimalId || null);
  const [savedImageUri, setSavedImageUri] = useState<string | null>(initialExistingImageUri || null);
  // Generate silly name for new animals, use saved name for editing existing animals
  // Keep a list of generated names so users can cycle through them
  const nameListRef = useRef<string[]>([initialSavedAnimalId ? animalName : generateSillyName()]);
  const [currentNameIndex, setCurrentNameIndex] = useState(0);
  const generatedName = nameListRef.current[currentNameIndex];
  const [showConfetti, setShowConfetti] = useState(false);
  const canvasRef = useRef<GlColoringCanvasRef>(null);
  const confettiRef = useRef<any>(null);
  const hasSpokenRef = useRef(false); // Track if name has been spoken before

  // Track dimensions for responsive layout
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const isPortrait = dimensions.height > dimensions.width;

  // Update dimensions on screen rotation
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Defer confetti to next frame to avoid blocking UI updates
  useEffect(() => {
    if (showConfetti && confettiRef.current) {
      // Wait for next frame after modal renders
      requestAnimationFrame(() => {
        confettiRef.current?.start();
      });
    }
  }, [showConfetti]);

  // Reset confetti state when modal closes
  useEffect(() => {
    if (!showSuccessModal) {
      setShowConfetti(false);
    }
  }, [showSuccessModal]);

  // Stable color select handler
  const handleColorSelect = useCallback((color: string) => {
    console.log('[ColorSelect] Pressed, starting...');
    const t0 = Date.now();
    setActiveColor(color);
    const t1 = Date.now();
    console.log('[ColorSelect] setActiveColor took:', t1 - t0, 'ms');
    canvasRef.current?.setColor(color);
    const t2 = Date.now();
    console.log('[ColorSelect] setColor took:', t2 - t1, 'ms');
    console.log('[ColorSelect] Total onPress:', t2 - t0, 'ms');
  }, []);

  // Set initial color when canvas is ready (runs once)
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.setColor(activeColor);
    }
  }, []); // Empty deps - only run on mount

  // Speak introduction first time, then just the name
  const speakName = useCallback(() => {
    if (!hasSpokenRef.current) {
      // First time: say the introduction
      Speech.speak(`Choose your animal's name: ${generatedName}`, {
        language: 'en-US',
        pitch: 1.1, // Slightly higher pitch for kid-friendly voice
        rate: 0.85, // Slightly slower for clarity
      });
      hasSpokenRef.current = true;
    } else {
      // Subsequent times: just say the name
      Speech.speak(generatedName, {
        language: 'en-US',
        pitch: 1.1, // Slightly higher pitch for kid-friendly voice
        rate: 0.85, // Slightly slower for clarity
      });
    }
  }, [generatedName]);

  // Navigate to the next name (generates a new one if at the end)
  const nextName = useCallback(() => {
    if (currentNameIndex < nameListRef.current.length - 1) {
      // Move to next existing name
      setCurrentNameIndex(currentNameIndex + 1);
    } else {
      // Generate a new name and add to list
      const newName = generateSillyName();
      nameListRef.current.push(newName);
      setCurrentNameIndex(nameListRef.current.length - 1);
    }
  }, [currentNameIndex]);

  // Navigate to the previous name
  const previousName = useCallback(() => {
    if (currentNameIndex > 0) {
      setCurrentNameIndex(currentNameIndex - 1);
    }
  }, [currentNameIndex]);

  // Measure when layout is committed
  useLayoutEffect(() => {
    console.log('[ColoringScreen] useLayoutEffect - layout committed for color:', activeColor);
  }, [activeColor]);

  // Measure when effects run (after paint)
  useEffect(() => {
    console.log('[ColoringScreen] useEffect - paint complete for color:', activeColor);
  }, [activeColor]);

  console.log('[ColoringScreen] About to render JSX, activeColor:', activeColor);

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

          <View style={styles.titleContainer}>
            <Pressable
              onPress={previousName}
              style={[styles.speakerBtn, currentNameIndex === 0 && styles.disabledBtn]}
              accessibilityLabel="Previous name"
              disabled={currentNameIndex === 0}
            >
              <ChevronLeft size={28} color={currentNameIndex === 0 ? "#999" : "#FFD93D"} />
            </Pressable>
            <Text style={styles.screenTitle}>{generatedName}</Text>
            <Pressable
              onPress={nextName}
              style={styles.speakerBtn}
              accessibilityLabel="Next name"
            >
              <ChevronRight size={28} color="#FFD93D" />
            </Pressable>
            <Pressable
              onPress={speakName}
              style={styles.speakerBtn}
              accessibilityLabel="Hear name spoken aloud"
            >
              <Volume2 size={32} color="#FFD93D" />
            </Pressable>
          </View>

          <MusicToggle />
        </View>

        {/* Main layout - vertical for portrait, horizontal for landscape */}
        <View style={[styles.main, isPortrait ? styles.mainPortrait : styles.mainLandscape]}>
          {/* Canvas - Displays the hybrid PNG chosen from CreateScreen
              The hybridKey is passed via navigation params and loaded by GlColoringCanvas */}
          <View style={isPortrait ? styles.canvasWrapPortrait : styles.canvasWrapLandscape}>
            <View
              style={styles.canvas}
              onLayout={(e: LayoutChangeEvent) => {
                const { width, height } = e.nativeEvent.layout;
                setCanvasSize({ width, height });
              }}
            >
              {(hybridKey || baseAnimalKey) ? (
                <GlColoringCanvas
                  ref={canvasRef}
                  hybridKey={hybridKey}
                  baseAnimalKey={baseAnimalKey}
                  existingImageUri={initialExistingImageUri}
                  activeTool={activeTool}
                  brushWidth={brushWidth}
                  width="100%"
                  height="100%"
                />
              ) : (
                <Text style={styles.canvasPlaceholder}>Your animal will appear here</Text>
              )}
            </View>
          </View>

          {/* Color Panel */}
          <View style={[styles.panel, isPortrait ? styles.panelPortrait : styles.panelLandscape]}>
            <View style={[styles.panelHeaderContainer]}>
              <View style={styles.panelHeader}>
                <Palette size={24} color="#111" />
                <Text style={styles.panelTitle}>Colors</Text>
              </View>
            </View>

            {/* Tool Switch - Horizontal tabs */}
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

            {/* Brush Width Selector - Only visible when brush tool is active */}
            {activeTool === "brush" && (
              <View style={styles.brushWidthRow}>
                {[4, 8, 16, 24].map((width) => (
                  <Pressable
                    key={width}
                    onPress={() => setBrushWidth(width)}
                    style={[
                      styles.brushWidthBtn,
                      brushWidth === width && styles.brushWidthBtnActive
                    ]}
                  >
                    <View
                      style={[
                        styles.brushWidthDot,
                        { width: width / 2, height: width / 2, borderRadius: width / 4 },
                        brushWidth === width && styles.brushWidthDotActive
                      ]}
                    />
                  </Pressable>
                ))}
              </View>
            )}

            {/* Palette - 10 swatches per row in portrait, fewer in landscape */}
            <View style={isPortrait ? styles.palettePortrait : styles.paletteLandscape}>
              {DEFAULT_COLORS.map((c) => (
                <ColorSwatch
                  key={c}
                  color={c}
                  isSelected={c === activeColor}
                  onSelect={() => handleColorSelect(c)}
                  swatchStyle={isPortrait ? styles.swatchPortrait : styles.swatchLandscape}
                />
              ))}
            </View>

            {/* Action Buttons Row/Column */}
            <View style={isPortrait ? styles.actionButtonsRow : styles.actionButtonsColumn}>
              {/* Undo Button */}
              <Pressable
                onPress={() => {
                  canvasRef.current?.undo();
                }}
                style={isPortrait ? styles.actionBtn : styles.actionBtnLandscape}
              >
                <RotateCcw size={16} color="#333" />
                <Text style={styles.actionBtnText}>Undo</Text>
              </Pressable>

              {/* Clear Button */}
              <Pressable
                onPress={() => {
                  canvasRef.current?.clear();
                }}
                style={isPortrait ? styles.actionBtn : styles.actionBtnLandscape}
              >
                <Trash2 size={16} color="#333" />
                <Text style={styles.actionBtnText}>Clear</Text>
              </Pressable>

              {/* View Animal Pen - Show after saving, in same row */}
              {hasSaved && (
                <Pressable
                  onPress={() => {
                    navigation.navigate("Pen" as never);
                  }}
                  style={isPortrait ? styles.actionBtn : styles.actionBtnLandscape}
                >
                  <PawPrint size={16} color="#333" />
                  <Text style={styles.actionBtnText}>View Pen</Text>
                </Pressable>
              )}

              {/* Save Button - 50% width in portrait, full width in landscape */}
              <LinearGradient
                colors={["#00C950", "#00BC7D"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={isPortrait ? styles.actionBtnSave : styles.actionBtnSaveLandscape}
              >
                <Pressable
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 }}
                  onPress={() => {
                    const isUpdate = !!savedAnimalId;

                    // Show modal and trigger confetti immediately for instant feedback
                    if (!isUpdate) {
                      setShowSuccessModal(true);
                      setShowConfetti(true);
                    } else {
                      setShowConfetti(true);
                      setTimeout(() => setShowConfetti(false), 3000);
                    }

                    // Defer the save operation to next tick so UI updates immediately
                    setTimeout(async () => {
                      try {
                        // Save the image
                        const imageUri = await canvasRef.current?.save(savedImageUri || undefined);
                        const animalKey = hybridKey || baseAnimalKey;
                        if (imageUri && animalKey) {
                          if (isUpdate) {
                            // Update existing save (file already overwritten, update name too)
                            await updateAnimal(savedAnimalId, imageUri, generatedName);
                          } else {
                            // First save - create new and store ID and URI
                            const id = await saveAnimal(animalKey, generatedName, imageUri);
                            setSavedAnimalId(id);
                            setSavedImageUri(imageUri);
                            setHasSaved(true);
                          }
                        }
                      } catch (error) {
                        console.error("Save error:", error);
                        // Hide confetti on error
                        setShowConfetti(false);
                        setShowSuccessModal(false);
                        Alert.alert("Oops!", "Something went wrong. Please try again.");
                      }
                    }, 0);
                  }}
                >
                  <Save size={18} color="#fff" />
                  <Text style={styles.saveText}>Save to Pen</Text>
                </Pressable>
              </LinearGradient>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Performance-optimized confetti - only render when needed */}
      {showConfetti && (
        <ConfettiCannon
          ref={confettiRef}
          count={75}
          origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
          autoStart={false}
          fadeOut={true}
          explosionSpeed={350}
          fallSpeed={2000}
          colors={['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#FFD93D', '#6BCF7F']}
        />
      )}

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
              <ThumbsUp size={20} color="#fff" style={{ marginRight: 8 }} />
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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  screenTitle: {
    fontFamily: "MadimiOne_400Regular",
    color: "#fff",
    fontSize: 42,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  speakerBtn: {
    padding: 4,
    marginTop: 4,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  main: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  mainPortrait: {
    flexDirection: "column",
    gap: 24,
  },
  mainLandscape: {
    flexDirection: "row",
    gap: 16,
  },
  canvasWrapPortrait: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  canvasWrapLandscape: {
    flex: 1,
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
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
    gap: 12,
  },
  panelPortrait: {
    width: "100%",
  },
  panelLandscape: {
    width: 280,
    height: '100%',
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
  toolColumn: {
    flexDirection: "column",
    width: "auto",
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
  brushWidthRow: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "stretch",
    width: "100%",
    marginTop: 8,
    marginBottom: 8,
  },
  brushWidthBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee",
    paddingVertical: 12,
    borderRadius: 10,
  },
  brushWidthBtnActive: {
    backgroundColor: "#A133F5",
  },
  brushWidthDot: {
    backgroundColor: "#666",
  },
  brushWidthDotActive: {
    backgroundColor: "#fff",
  },
  palettePortrait: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    alignItems: "flex-start",
    marginBlock: 8,
    alignSelf: "stretch",
  },
  paletteLandscape: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "flex-start",
    marginBlock: 8,
    alignSelf: "stretch",
  },
  swatch: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    borderColor: "transparent", // Always have border to prevent layout shift
  },
  swatchPortrait: {
  },
  swatchLandscape: {
  },
  swatchActive: {
    borderColor: "#111", // Just change color, not width
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "stretch",
    width: "100%",
    marginTop: 8,
  },
  actionButtonsColumn: {
    flexDirection: "column",
    gap: 8,
    alignSelf: "stretch",
    width: "100%",
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#999",
  },
  actionBtnLandscape: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#999",
  },
  actionBtnSave: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnSaveLandscape: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnText: {
    fontFamily: "MadimiOne_400Regular",
    color: "#333",
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  ghostBtn: {
    flex: 1,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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