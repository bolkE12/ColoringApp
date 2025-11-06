import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, ActivityIndicator, Text, StyleSheet, Image } from "react-native";
import { Canvas, Image as SkiaImage, Skia, useCanvasRef } from "@shopify/react-native-skia";
import { SvgXml } from "react-native-svg";
import { loadHybridXml } from "../src/utils/assetLoader.native";
import { floodFill, hexToRgba } from "../src/utils/floodFill";

// @ts-ignore - UPNG has no types
const UPNG = require("upng-js");

const TARGET_SIZE = 1024;

type Props = {
  hybridKey: string;
  selectedColor: string;
  width?: number | string;
  height?: number | string;
};

export default function SkiaColoringCanvas({
  hybridKey,
  selectedColor,
  width = "100%",
  height = "100%"
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [colorOverlay, setColorOverlay] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Store the pixel data for flood-fill operations
  const pixelDataRef = useRef<Uint8ClampedArray | null>(null);
  const canvasRef = useCanvasRef();

  // Step 1: Load SVG file
  // Step 2: Create Skia Surface (bitmap canvas)
  // Step 3: Draw the SVG onto the surface (rasterizes it)
  // Step 4: Get the pixel array from the surface
  useEffect(() => {
    let cancelled = false;

    async function initializeCanvas() {
      try {
        setLoading(true);
        setError(null);

        console.log("[SkiaColoringCanvas] Step 1: Loading SVG file...");
        const xml = await loadHybridXml(hybridKey);

        if (cancelled) return;

        // Store SVG for display
        setSvgXml(xml);

        console.log("[SkiaColoringCanvas] Step 2: Creating Skia Surface (bitmap canvas)...");
        // Create an offscreen surface for rasterization
        const surface = (Skia as any).Surface.MakeOffscreen(TARGET_SIZE, TARGET_SIZE);
        if (!surface) {
          throw new Error("Failed to create Skia surface");
        }

        const canvas = surface.getCanvas();

        // Fill with WHITE background (this will be the fillable interior)
        console.log("[SkiaColoringCanvas] Drawing white background...");
        const whitePaint = Skia.Paint();
        whitePaint.setColor(Skia.Color("white"));
        canvas.drawRect(
          Skia.XYWHRect(0, 0, TARGET_SIZE, TARGET_SIZE),
          whitePaint
        );

        console.log("[SkiaColoringCanvas] Step 3: Drawing SVG onto surface (rasterizing)...");
        // Parse and draw the SVG
        const svg = Skia.SVG.MakeFromString(xml);
        if (!svg) {
          throw new Error("Failed to parse SVG");
        }

        // Scale and center the SVG
        const svgWidth = (svg as any).width?.() || TARGET_SIZE;
        const svgHeight = (svg as any).height?.() || TARGET_SIZE;
        const scale = Math.min(TARGET_SIZE / svgWidth, TARGET_SIZE / svgHeight) * 0.9;
        const offsetX = (TARGET_SIZE - svgWidth * scale) / 2;
        const offsetY = (TARGET_SIZE - svgHeight * scale) / 2;

        canvas.save();
        canvas.translate(offsetX, offsetY);
        canvas.scale(scale, scale);

        // Draw the SVG (this draws the black outline)
        const picture = (svg as any).getPicture?.();
        if (picture) {
          canvas.drawPicture(picture);
        } else {
          (svg as any).render?.(canvas);
        }

        canvas.restore();

        console.log("[SkiaColoringCanvas] Step 4: Getting pixel array from surface...");
        // Get the rasterized image
        const snapshot = surface.makeImageSnapshot();

        // Encode to PNG and decode to get raw pixel data
        const pngData = snapshot.encodeToBytes();
        const pngArray = new Uint8Array((pngData as any).buffer || pngData);

        // Decode PNG to RGBA pixels
        const decoded = UPNG.decode(pngArray);
        const rgba = UPNG.toRGBA8(decoded);
        const pixels = new Uint8ClampedArray(rgba[0]);

        // Store the pixel data for flood-fill operations
        pixelDataRef.current = pixels;

        console.log("[SkiaColoringCanvas] Initialization complete!");
        console.log("[SkiaColoringCanvas] Bitmap ready with", pixels.length / 4, "pixels for coloring");
        setLoading(false);

      } catch (err) {
        if (!cancelled) {
          console.error("[SkiaColoringCanvas] Error:", err);
          setError(err instanceof Error ? err.message : "Failed to initialize canvas");
          setLoading(false);
        }
      }
    }

    initializeCanvas();

    return () => {
      cancelled = true;
    };
  }, [hybridKey]);

  // Helper: Create Skia image from pixel data
  const createSkiaImageFromPixels = (pixels: Uint8ClampedArray, width: number, height: number) => {
    try {
      // Encode pixels to PNG
      const pngBuffer = UPNG.encode([pixels.buffer], width, height, 0);
      const pngArray = new Uint8Array(pngBuffer);

      // Create Skia image from PNG data
      const data = Skia.Data.fromBytes(pngArray);
      const image = Skia.Image.MakeImageFromEncoded(data);

      return image;
    } catch (err) {
      console.error("[SkiaColoringCanvas] Error creating image:", err);
      return null;
    }
  };

  // Step 5: Apply the flood fill algorithm
  // Step 6: Create a new image from the modified pixels
  const handleCanvasTap = useCallback((event: any) => {
    if (!pixelDataRef.current) {
      console.log("[SkiaColoringCanvas] Pixel data not ready");
      return;
    }

    const { locationX, locationY } = event.nativeEvent;

    // Map touch coordinates to bitmap coordinates
    const scaleX = TARGET_SIZE / containerSize.width;
    const scaleY = TARGET_SIZE / containerSize.height;
    const bitmapX = Math.floor(locationX * scaleX);
    const bitmapY = Math.floor(locationY * scaleY);

    console.log(`[SkiaColoringCanvas] Tap at: (${bitmapX}, ${bitmapY})`);

    // Check the pixel color at tap location
    const idx = (bitmapY * TARGET_SIZE + bitmapX) * 4;
    const r = pixelDataRef.current[idx];
    const g = pixelDataRef.current[idx + 1];
    const b = pixelDataRef.current[idx + 2];
    const a = pixelDataRef.current[idx + 3];

    console.log(`[SkiaColoringCanvas] Pixel color at tap: rgba(${r}, ${g}, ${b}, ${a})`);

    // Don't fill if tapping on the black outline
    if (r < 50 && g < 50 && b < 50) {
      console.log("[SkiaColoringCanvas] Tapped on outline, ignoring");
      return;
    }

    console.log("[SkiaColoringCanvas] Step 5: Applying flood-fill algorithm...");

    // Make a copy of the pixel data for flood-fill
    const workingPixels = new Uint8ClampedArray(pixelDataRef.current);

    // Convert selected color to RGBA
    const fillColor = hexToRgba(selectedColor);
    console.log(`[SkiaColoringCanvas] Filling with color: rgba(${fillColor.join(", ")})`);

    // Apply flood-fill (tolerance of 10 for anti-aliasing)
    floodFill(workingPixels, TARGET_SIZE, TARGET_SIZE, bitmapX, bitmapY, fillColor, 10);

    // Update the stored pixel data
    pixelDataRef.current = workingPixels;

    console.log("[SkiaColoringCanvas] Step 6: Creating new image from modified pixels...");

    // Create a colored overlay PNG (only the colored pixels, rest transparent)
    const overlayPixels = new Uint8ClampedArray(TARGET_SIZE * TARGET_SIZE * 4);
    for (let i = 0; i < overlayPixels.length; i += 4) {
      // If this pixel was colored (matches fill color), show it
      if (workingPixels[i] === fillColor[0] &&
          workingPixels[i+1] === fillColor[1] &&
          workingPixels[i+2] === fillColor[2] &&
          workingPixels[i+3] === fillColor[3] &&
          workingPixels[i] !== 255) { // Not white
        overlayPixels[i] = workingPixels[i];
        overlayPixels[i+1] = workingPixels[i+1];
        overlayPixels[i+2] = workingPixels[i+2];
        overlayPixels[i+3] = workingPixels[i+3];
      } else {
        // Transparent
        overlayPixels[i+3] = 0;
      }
    }

    // Encode overlay to data URI
    const overlayPng = UPNG.encode([overlayPixels.buffer], TARGET_SIZE, TARGET_SIZE, 0);
    const overlayU8 = new Uint8Array(overlayPng);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < overlayU8.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(overlayU8.subarray(i, i + chunkSize)));
    }
    // @ts-ignore - btoa is available in React Native
    const base64 = btoa(binary);
    const dataUri = `data:image/png;base64,${base64}`;

    setColorOverlay(dataUri);
    console.log("[SkiaColoringCanvas] Flood-fill complete!");

  }, [selectedColor, containerSize]);

  if (loading) {
    return (
      <View style={[styles.container, { width, height }]}>
        <ActivityIndicator size="large" color="#A133F5" />
        <Text style={styles.text}>Loading canvas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.errorText}>Error: {error}</Text>
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
      {/* Base SVG display (rendered by react-native-svg) */}
      {svgXml && (
        <SvgXml
          xml={svgXml}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      {/* Color overlay (shows filled regions) */}
      {colorOverlay && (
        <View style={styles.overlayContainer} pointerEvents="none">
          <Image
            source={{ uri: colorOverlay }}
            style={styles.overlayImage}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Touch overlay for handling taps */}
      <View
        style={styles.touchOverlay}
        onStartShouldSetResponder={() => true}
        onResponderRelease={handleCanvasTap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontFamily: "MadimiOne_400Regular",
  },
  errorText: {
    fontSize: 16,
    color: "#FF6B6B",
    fontFamily: "MadimiOne_400Regular",
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  overlayImage: {
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
});
