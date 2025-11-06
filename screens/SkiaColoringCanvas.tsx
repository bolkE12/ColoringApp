import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Canvas, Skia, useCanvasRef, useTouchHandler, Image as SkiaImage } from "@shopify/react-native-skia";
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
  const [error, setError] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const canvasRef = useCanvasRef();

  // Store images and pixel data
  const baseImageRef = useRef<any>(null);
  const colorImageRef = useRef<any>(null);
  const pixelDataRef = useRef<Uint8ClampedArray | null>(null);
  const [updateCounter, setUpdateCounter] = useState(0);

  // Load PNG and initialize
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        setError(null);

        // Load the PNG asset
        const uri = await getHybridPngUri(hybridKey);
        if (cancelled) return;

        // Fetch the PNG file
        const response = await fetch(uri);
        const blob = await response.blob();

        // Convert to ArrayBuffer
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });

        if (cancelled) return;

        // Decode PNG to RGBA pixels
        const pngArray = new Uint8Array(arrayBuffer);
        const decoded = UPNG.decode(pngArray);
        const rgba = UPNG.toRGBA8(decoded);
        const pixels = new Uint8ClampedArray(rgba[0]);

        // Store pixel data for flood-fill
        pixelDataRef.current = pixels;

        // Create Skia image from PNG data
        const data = Skia.Data.fromBytes(pngArray);
        const image = Skia.Image.MakeImageFromEncoded(data);
        baseImageRef.current = image;

        // Create initial empty color overlay (all transparent)
        const emptyPixels = new Uint8ClampedArray(TARGET_SIZE * TARGET_SIZE * 4);
        colorImageRef.current = null; // Start with no overlay

        setUpdateCounter(prev => prev + 1);

      } catch (err) {
        if (!cancelled) {
          console.error("[SkiaColoringCanvas] Error:", err);
          setError(err instanceof Error ? err.message : "Failed to load PNG");
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [hybridKey]);

  // Handle touch events
  const touchHandler = useTouchHandler({
    onEnd: (event) => {
      if (!pixelDataRef.current || !canvasRef.current) return;

      const { x, y } = event;

      // Calculate scale and offset
      const scale = Math.min(
        containerSize.width / TARGET_SIZE,
        containerSize.height / TARGET_SIZE
      );
      const displayWidth = TARGET_SIZE * scale;
      const displayHeight = TARGET_SIZE * scale;
      const offsetX = (containerSize.width - displayWidth) / 2;
      const offsetY = (containerSize.height - displayHeight) / 2;

      // Convert touch to bitmap coordinates
      const imageX = x - offsetX;
      const imageY = y - offsetY;

      if (imageX < 0 || imageX >= displayWidth || imageY < 0 || imageY >= displayHeight) {
        return;
      }

      const bitmapX = Math.floor((imageX / displayWidth) * TARGET_SIZE);
      const bitmapY = Math.floor((imageY / displayHeight) * TARGET_SIZE);
      const clampedX = Math.max(0, Math.min(TARGET_SIZE - 1, bitmapX));
      const clampedY = Math.max(0, Math.min(TARGET_SIZE - 1, bitmapY));

      // Check pixel at tap location
      const idx = (clampedY * TARGET_SIZE + clampedX) * 4;
      const r = pixelDataRef.current[idx];
      const g = pixelDataRef.current[idx + 1];
      const b = pixelDataRef.current[idx + 2];

      // Don't fill black outline or already-filled color
      if (r < 50 && g < 50 && b < 50) return;

      const fillColor = hexToRgba(selectedColor);
      if (r === fillColor[0] && g === fillColor[1] && b === fillColor[2]) return;

      // Perform flood-fill
      const workingPixels = new Uint8ClampedArray(pixelDataRef.current);
      floodFill(workingPixels, TARGET_SIZE, TARGET_SIZE, clampedX, clampedY, fillColor, 20);
      pixelDataRef.current = workingPixels;

      // Create color overlay pixels (only colored pixels)
      const overlayPixels = new Uint8ClampedArray(TARGET_SIZE * TARGET_SIZE * 4);
      for (let i = 0; i < workingPixels.length; i += 4) {
        const r = workingPixels[i];
        const g = workingPixels[i+1];
        const b = workingPixels[i+2];

        // Skip white or black
        if ((r > 240 && g > 240 && b > 240) || (r < 50 && g < 50 && b < 50)) {
          continue;
        }

        overlayPixels[i] = r;
        overlayPixels[i+1] = g;
        overlayPixels[i+2] = b;
        overlayPixels[i+3] = 255;
      }

      // Create Skia image directly from pixel data (no PNG encoding!)
      const data = Skia.Data.fromBytes(overlayPixels);
      const overlayImage = Skia.Image.MakeImage(
        {
          width: TARGET_SIZE,
          height: TARGET_SIZE,
          alphaType: Skia.AlphaType.Unpremul,
          colorType: Skia.ColorType.RGBA_8888,
        },
        data,
        TARGET_SIZE * 4
      );
      colorImageRef.current = overlayImage;

      // Trigger re-render
      setUpdateCounter(prev => prev + 1);
    }
  });

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
      <Canvas
        ref={canvasRef}
        style={{ flex: 1 }}
        onTouch={touchHandler}
      >
        {baseImageRef.current && containerSize.width > 0 && (() => {
          // Calculate scale to fit canvas
          const scale = Math.min(
            containerSize.width / TARGET_SIZE,
            containerSize.height / TARGET_SIZE
          );
          const scaledWidth = TARGET_SIZE * scale;
          const scaledHeight = TARGET_SIZE * scale;
          const offsetX = (containerSize.width - scaledWidth) / 2;
          const offsetY = (containerSize.height - scaledHeight) / 2;

          return (
            <>
              {/* Draw base PNG */}
              <SkiaImage
                image={baseImageRef.current}
                x={offsetX}
                y={offsetY}
                width={scaledWidth}
                height={scaledHeight}
                fit="cover"
              />
              {/* Draw color overlay */}
              {colorImageRef.current && (
                <SkiaImage
                  image={colorImageRef.current}
                  x={offsetX}
                  y={offsetY}
                  width={scaledWidth}
                  height={scaledHeight}
                  fit="cover"
                />
              )}
            </>
          );
        })()}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  errorText: {
    fontSize: 16,
    color: "#FF6B6B",
    fontFamily: "MadimiOne_400Regular",
  },
});
