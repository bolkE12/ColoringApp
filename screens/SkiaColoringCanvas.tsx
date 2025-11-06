import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, ActivityIndicator, Text, StyleSheet, Image } from "react-native";
import { getHybridPngUri } from "../src/utils/assetLoader.native";
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
  const [pngUri, setPngUri] = useState<string | null>(null);
  const [colorOverlay, setColorOverlay] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Store the pixel data for flood-fill operations
  const pixelDataRef = useRef<Uint8ClampedArray | null>(null);

  // Step 1: Load PNG file
  // Step 2: Decode PNG to get pixel data
  useEffect(() => {
    let cancelled = false;

    async function initializeCanvas() {
      try {
        setLoading(true);
        setError(null);

        console.log("[PngColoringCanvas] Step 1: Loading PNG file...");

        // Load the PNG asset using the asset loader
        const uri = await getHybridPngUri(hybridKey);

        if (cancelled) return;

        // Store URI for display
        setPngUri(uri);

        console.log("[PngColoringCanvas] Step 2: Fetching PNG data...");

        // Fetch the PNG file as a blob
        const response = await fetch(uri);
        const blob = await response.blob();

        // Convert blob to ArrayBuffer
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });

        if (cancelled) return;

        console.log("[PngColoringCanvas] Step 3: Decoding PNG to pixel data...");

        // Decode PNG to RGBA pixels using UPNG
        const pngArray = new Uint8Array(arrayBuffer);
        const decoded = UPNG.decode(pngArray);
        const rgba = UPNG.toRGBA8(decoded);
        const pixels = new Uint8ClampedArray(rgba[0]);

        console.log("[PngColoringCanvas] PNG dimensions:", decoded.width, "x", decoded.height);
        console.log("[PngColoringCanvas] Total pixels:", pixels.length / 4);

        // Store the pixel data for flood-fill operations
        pixelDataRef.current = pixels;

        // Debug: Check if we have any dark pixels (the outline)
        let darkPixelCount = 0;
        let whitePixelCount = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          if (a > 200 && r < 50 && g < 50 && b < 50) {
            darkPixelCount++;
          }
          if (a > 200 && r > 240 && g > 240 && b > 240) {
            whitePixelCount++;
          }
        }

        console.log("[PngColoringCanvas] Bitmap analysis:");
        console.log("  - Dark pixels (outline):", darkPixelCount);
        console.log("  - White pixels (interior):", whitePixelCount);
        console.log("  - Total pixels:", pixels.length / 4);

        if (darkPixelCount === 0) {
          console.warn("[PngColoringCanvas] WARNING: No dark outline pixels found!");
        } else {
          console.log("[PngColoringCanvas] ✓ PNG loaded successfully with", darkPixelCount, "outline pixels");
        }

        console.log("[PngColoringCanvas] Initialization complete!");
        setLoading(false);

      } catch (err) {
        if (!cancelled) {
          console.error("[PngColoringCanvas] Error:", err);
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

  // Step 3: Apply the flood fill algorithm
  // Step 4: Create a new image from the modified pixels
  const handleCanvasTap = useCallback((event: any) => {
    if (!pixelDataRef.current) {
      console.log("[PngColoringCanvas] Pixel data not ready");
      return;
    }

    const { locationX, locationY } = event.nativeEvent;

    // Map touch coordinates to bitmap coordinates
    const scaleX = TARGET_SIZE / containerSize.width;
    const scaleY = TARGET_SIZE / containerSize.height;
    const bitmapX = Math.floor(locationX * scaleX);
    const bitmapY = Math.floor(locationY * scaleY);

    console.log(`[PngColoringCanvas] Tap at: (${bitmapX}, ${bitmapY})`);

    // Check the pixel color at tap location
    const idx = (bitmapY * TARGET_SIZE + bitmapX) * 4;
    const r = pixelDataRef.current[idx];
    const g = pixelDataRef.current[idx + 1];
    const b = pixelDataRef.current[idx + 2];
    const a = pixelDataRef.current[idx + 3];

    console.log(`[PngColoringCanvas] Pixel color at tap: rgba(${r}, ${g}, ${b}, ${a})`);

    // Don't fill if tapping on the black outline
    if (r < 50 && g < 50 && b < 50) {
      console.log("[PngColoringCanvas] Tapped on outline, ignoring");
      return;
    }

    console.log("[PngColoringCanvas] Step 3: Applying flood-fill algorithm...");

    // Make a copy of the pixel data for flood-fill
    const workingPixels = new Uint8ClampedArray(pixelDataRef.current);

    // Convert selected color to RGBA
    const fillColor = hexToRgba(selectedColor);
    console.log(`[PngColoringCanvas] Filling with color: rgba(${fillColor.join(", ")})`);

    // Apply flood-fill (tolerance of 10 for anti-aliasing)
    floodFill(workingPixels, TARGET_SIZE, TARGET_SIZE, bitmapX, bitmapY, fillColor, 10);

    // Update the stored pixel data
    pixelDataRef.current = workingPixels;

    console.log("[PngColoringCanvas] Step 4: Creating new image from modified pixels...");

    // Create a colored overlay PNG (only the colored pixels, rest transparent)
    const overlayPixels = new Uint8ClampedArray(TARGET_SIZE * TARGET_SIZE * 4);
    let overlayPixelCount = 0;

    for (let i = 0; i < overlayPixels.length; i += 4) {
      const r = workingPixels[i];
      const g = workingPixels[i+1];
      const b = workingPixels[i+2];
      const a = workingPixels[i+3];

      // Check if this pixel matches the fill color (was just colored)
      const matchesFillColor = (r === fillColor[0] && g === fillColor[1] &&
                                b === fillColor[2] && a === fillColor[3]);

      // Check if it's NOT white (white is r=255, g=255, b=255)
      const isNotWhite = !(r === 255 && g === 255 && b === 255);

      // Check if it's NOT black (the outline)
      const isNotBlack = !(r < 50 && g < 50 && b < 50);

      if (matchesFillColor && isNotWhite && isNotBlack) {
        overlayPixels[i] = r;
        overlayPixels[i+1] = g;
        overlayPixels[i+2] = b;
        overlayPixels[i+3] = a;
        overlayPixelCount++;
      } else {
        // Transparent
        overlayPixels[i] = 0;
        overlayPixels[i+1] = 0;
        overlayPixels[i+2] = 0;
        overlayPixels[i+3] = 0;
      }
    }

    console.log("[PngColoringCanvas] Overlay has", overlayPixelCount, "colored pixels");

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
    console.log("[PngColoringCanvas] Flood-fill complete!");

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
      {/* Base PNG display */}
      {pngUri && (
        <Image
          source={{ uri: pngUri }}
          style={styles.baseImage}
          resizeMode="contain"
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
  baseImage: {
    width: "100%",
    height: "100%",
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
