import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, ActivityIndicator, Text, StyleSheet, Image } from "react-native";
import { SvgXml } from "react-native-svg";
import { Skia } from "@shopify/react-native-skia";
import { loadHybridXml } from "../src/utils/assetLoader.native";
import { floodFill, hexToRgba } from "../src/utils/floodFill";

// @ts-ignore - UPNG has no types
const UPNG = require("upng-js");

const TARGET_SIZE = 1024;

type Props = {
  hybridKey: string;
  color: string;
  width?: number | string;
  height?: number | string;
  onDidPaint?: () => void;
};

export default function ColorableSvgDisplay({
  hybridKey,
  color,
  width = "100%",
  height = "100%",
  onDidPaint
}: Props) {
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colorOverlay, setColorOverlay] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Store the rasterized base image for flood-fill operations
  const baseImageData = useRef<Uint8ClampedArray | null>(null);
  const coloredImageData = useRef<Uint8ClampedArray | null>(null);
  const animalBounds = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSvg() {
      try {
        setLoading(true);
        setError(null);
        console.log("[ColorableSvgDisplay] Loading hybrid:", hybridKey);

        const xml = await loadHybridXml(hybridKey);

        if (!cancelled) {
          console.log("[ColorableSvgDisplay] SVG loaded successfully");
          setSvgXml(xml);

          // Rasterize SVG for flood-fill operations
          await rasterizeSvg(xml);

          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[ColorableSvgDisplay] Error loading SVG:", err);
          setError(err instanceof Error ? err.message : "Failed to load SVG");
          setLoading(false);
        }
      }
    }

    loadSvg();

    return () => {
      cancelled = true;
    };
  }, [hybridKey]);

  const rasterizeSvg = async (xml: string) => {
    try {
      console.log("[ColorableSvgDisplay] Rasterizing SVG for flood-fill...");

      // Create an offscreen surface
      const MakeOffscreen = (Skia as any)?.Surface?.MakeOffscreen ||
                          (Skia as any)?.Surface?.Make;
      if (!MakeOffscreen) {
        console.warn("[ColorableSvgDisplay] Skia Surface not available");
        return;
      }

      const surface = MakeOffscreen(TARGET_SIZE, TARGET_SIZE);
      const canvas = surface.getCanvas();

      // White background
      const bgPaint = Skia.Paint();
      bgPaint.setColor(Skia.Color("#FFFFFFFF"));
      canvas.drawRect({ x: 0, y: 0, width: TARGET_SIZE, height: TARGET_SIZE }, bgPaint);

      // Parse and draw SVG
      const svg = Skia.SVG.MakeFromString(xml);
      if (!svg) {
        console.warn("[ColorableSvgDisplay] Failed to parse SVG");
        return;
      }

      const svgW = (svg as any)?.width?.() || TARGET_SIZE;
      const svgH = (svg as any)?.height?.() || TARGET_SIZE;
      const scale = Math.min(TARGET_SIZE / svgW, TARGET_SIZE / svgH);
      const offsetX = (TARGET_SIZE - svgW * scale) / 2;
      const offsetY = (TARGET_SIZE - svgH * scale) / 2;

      canvas.save();
      canvas.translate(offsetX, offsetY);
      canvas.scale(scale, scale);

      const picture = (svg as any)?.getPicture?.();
      if (picture) canvas.drawPicture(picture);
      else (svg as any)?.render?.(canvas);

      canvas.restore();

      // Get pixel data
      const snapshot = surface.makeImageSnapshot();
      const pngBytes = snapshot.encodeToBytes();
      const u8 = new Uint8Array((pngBytes as any).buffer || pngBytes);

      // Decode PNG to RGBA
      const decoded = UPNG.decode(u8);
      const rgba = UPNG.toRGBA8(decoded);
      baseImageData.current = new Uint8ClampedArray(rgba[0]);
      coloredImageData.current = new Uint8ClampedArray(rgba[0]); // Start with a copy

      // Calculate bounds of the animal (non-white, non-transparent pixels)
      animalBounds.current = calculateAnimalBounds(baseImageData.current, TARGET_SIZE, TARGET_SIZE);
      console.log("[ColorableSvgDisplay] Rasterization complete, bounds:", animalBounds.current);
    } catch (err) {
      console.error("[ColorableSvgDisplay] Rasterization error:", err);
    }
  };

  const calculateAnimalBounds = (
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): { minX: number; minY: number; maxX: number; maxY: number } | null => {
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Look for dark pixels (the outline) or non-white colored pixels
        const isDark = a > 200 && r < 220 && g < 220 && b < 220;

        if (isDark) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) return null;

    // Add padding around the bounds
    const padding = 20;
    return {
      minX: Math.max(0, minX - padding),
      minY: Math.max(0, minY - padding),
      maxX: Math.min(width - 1, maxX + padding),
      maxY: Math.min(height - 1, maxY + padding),
    };
  };

  const handleTouch = useCallback(async (event: any) => {
    if (!baseImageData.current || !coloredImageData.current) {
      console.log("[ColorableSvgDisplay] Image data not ready");
      return;
    }

    if (isProcessing) {
      console.log("[ColorableSvgDisplay] Already processing, ignoring tap");
      return;
    }

    const { locationX, locationY } = event.nativeEvent;
    console.log("[ColorableSvgDisplay] Touch at:", locationX, locationY, "color:", color);

    // Map touch coordinates to image space
    const scaleX = TARGET_SIZE / containerSize.width;
    const scaleY = TARGET_SIZE / containerSize.height;
    const imageX = Math.floor(locationX * scaleX);
    const imageY = Math.floor(locationY * scaleY);

    if (imageX < 0 || imageX >= TARGET_SIZE || imageY < 0 || imageY >= TARGET_SIZE) {
      console.log("[ColorableSvgDisplay] Touch outside canvas bounds");
      return;
    }

    // Check if touch is within animal bounds
    if (animalBounds.current) {
      const bounds = animalBounds.current;
      if (imageX < bounds.minX || imageX > bounds.maxX ||
          imageY < bounds.minY || imageY > bounds.maxY) {
        console.log("[ColorableSvgDisplay] Touch outside animal bounds");
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Perform flood-fill
      const rgba = hexToRgba(color);
      const workingCopy = new Uint8ClampedArray(coloredImageData.current);

      console.log("[ColorableSvgDisplay] Running flood-fill at", imageX, imageY);
      floodFill(workingCopy, TARGET_SIZE, TARGET_SIZE, imageX, imageY, rgba, 24);

      // Check if anything changed
      let changed = false;
      for (let i = 0; i < workingCopy.length; i++) {
        if (workingCopy[i] !== coloredImageData.current[i]) {
          changed = true;
          break;
        }
      }

      if (!changed) {
        console.log("[ColorableSvgDisplay] No pixels changed");
        return;
      }

      // Update the colored image data
      coloredImageData.current = workingCopy;

      // Create an overlay with only the colored pixels (transparent elsewhere)
      const overlayData = new Uint8ClampedArray(TARGET_SIZE * TARGET_SIZE * 4);
      for (let i = 0; i < overlayData.length; i += 4) {
        const base = baseImageData.current;
        const colored = coloredImageData.current;

        // If the pixel changed from the original, show it in the overlay
        if (colored[i] !== base[i] || colored[i+1] !== base[i+1] ||
            colored[i+2] !== base[i+2] || colored[i+3] !== base[i+3]) {
          overlayData[i] = colored[i];
          overlayData[i+1] = colored[i+1];
          overlayData[i+2] = colored[i+2];
          overlayData[i+3] = colored[i+3];
        } else {
          // Transparent
          overlayData[i] = overlayData[i+1] = overlayData[i+2] = overlayData[i+3] = 0;
        }
      }

      // Encode overlay to PNG and create data URI
      const pngBuffer = UPNG.encode([overlayData.buffer], TARGET_SIZE, TARGET_SIZE, 0);
      const u8 = new Uint8Array(pngBuffer);

      // Convert to base64
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < u8.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunkSize)));
      }
      // @ts-ignore - btoa is available in React Native
      const base64 = btoa(binary);
      const dataUri = `data:image/png;base64,${base64}`;

      setColorOverlay(dataUri);
      setIsProcessing(false);
      onDidPaint?.();
      console.log("[ColorableSvgDisplay] Color overlay updated");

    } catch (err) {
      console.error("[ColorableSvgDisplay] Flood-fill error:", err);
      setIsProcessing(false);
    }
  }, [color, containerSize, onDidPaint, isProcessing]);

  if (loading) {
    return (
      <View style={[styles.container, { width, height }]}>
        <ActivityIndicator size="large" color="#A133F5" />
        <Text style={styles.loadingText}>Loading your animal...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.errorText}>Failed to load animal</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  if (!svgXml) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.errorText}>No SVG data available</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { width, height }]}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setContainerSize({ width: w, height: h });
      }}
    >
      {/* Base SVG */}
      <SvgXml
        xml={svgXml}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* Color overlay (populated with flood-fill results) */}
      {colorOverlay && (
        <View style={styles.overlayContainer} pointerEvents="none">
          <Image
            source={{ uri: colorOverlay }}
            style={styles.overlay}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Touch handler overlay */}
      <View
        style={styles.touchOverlay}
        onStartShouldSetResponder={() => true}
        onResponderRelease={handleTouch}
      />

      {/* Processing indicator */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#A133F5" />
          <Text style={styles.processingText}>Coloring...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontFamily: "MadimiOne_400Regular",
  },
  errorText: {
    fontSize: 16,
    color: "#FF6B6B",
    fontFamily: "MadimiOne_400Regular",
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    width: "100%",
    height: "100%",
  },
  touchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontFamily: "MadimiOne_400Regular",
  },
});
