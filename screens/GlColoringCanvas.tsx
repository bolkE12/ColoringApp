import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { GLView } from "expo-gl";
import { getHybridPngUri } from "../src/utils/assetLoader.native";
import { floodFill, hexToRgba } from "../src/utils/floodFill";

// @ts-ignore - UPNG has no types
const UPNG = require("upng-js");

const TARGET_SIZE = 1024;

interface GlColoringCanvasProps {
  hybridKey: string;
  selectedColor: string;
  width?: string | number;
  height?: string | number;
}

// Vertex shader - passes through positions and texture coordinates
const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// Fragment shader - renders texture
const fragmentShaderSource = `
  precision mediump float;
  uniform sampler2D u_texture;
  varying vec2 v_texCoord;

  void main() {
    gl_FragColor = texture2D(u_texture, v_texCoord);
  }
`;

// Fragment shader for overlay with transparency
const overlayFragmentShaderSource = `
  precision mediump float;
  uniform sampler2D u_texture;
  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    // Only render non-transparent pixels
    if (color.a < 0.01) {
      discard;
    }
    gl_FragColor = color;
  }
`;

export default function GlColoringCanvas({
  hybridKey,
  selectedColor,
  width = "100%",
  height = "100%"
}: GlColoringCanvasProps) {
  const [error, setError] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Store WebGL context and resources
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const pixelDataRef = useRef<Uint8ClampedArray | null>(null);
  const baseTextureRef = useRef<WebGLTexture | null>(null);
  const overlayTextureRef = useRef<WebGLTexture | null>(null);
  const overlayPixelsRef = useRef<Uint8ClampedArray | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const overlayProgramRef = useRef<WebGLProgram | null>(null);
  const layoutRef = useRef({ offsetX: 0, offsetY: 0, scale: 1, displayWidth: 0, displayHeight: 0 });

  // Compile shader
  const compileShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  // Create shader program
  const createProgram = (gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram | null => {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  };

  // Setup quad geometry (two triangles covering the viewport)
  const setupQuad = (gl: WebGLRenderingContext, program: WebGLProgram) => {
    // Positions (clip space -1 to 1)
    const positions = new Float32Array([
      -1, -1,  // bottom-left
       1, -1,  // bottom-right
      -1,  1,  // top-left
       1,  1   // top-right
    ]);

    // Texture coordinates (0 to 1, flipped Y)
    const texCoords = new Float32Array([
      0, 1,  // bottom-left
      1, 1,  // bottom-right
      0, 0,  // top-left
      1, 0   // top-right
    ]);

    // Position buffer
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Texture coordinate buffer
    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texLoc = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
  };

  // Create texture from pixel data
  const createTexture = (gl: WebGLRenderingContext, pixels: Uint8ClampedArray, width: number, height: number): WebGLTexture | null => {
    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
  };

  // Render scene
  const render = useCallback(() => {
    const gl = glRef.current;
    if (!gl || !programRef.current || !overlayProgramRef.current || !baseTextureRef.current) return;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Enable blending for overlay
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw base image
    gl.useProgram(programRef.current);
    gl.bindTexture(gl.TEXTURE_2D, baseTextureRef.current);
    setupQuad(gl, programRef.current);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Draw overlay if exists
    if (overlayTextureRef.current) {
      gl.useProgram(overlayProgramRef.current);
      gl.bindTexture(gl.TEXTURE_2D, overlayTextureRef.current);
      setupQuad(gl, overlayProgramRef.current);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    gl.flush();
    gl.endFrameEXP();
  }, []);

  // Initialize WebGL context
  const onContextCreate = useCallback(async (gl: WebGLRenderingContext) => {
    try {
      glRef.current = gl;

      // Create shader programs
      const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
      const overlayProgram = createProgram(gl, vertexShaderSource, overlayFragmentShaderSource);

      if (!program || !overlayProgram) {
        throw new Error("Failed to create shader programs");
      }

      programRef.current = program;
      overlayProgramRef.current = overlayProgram;

      // Load PNG
      const uri = await getHybridPngUri(hybridKey);
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      // Decode PNG
      const pngArray = new Uint8Array(arrayBuffer);
      const decoded = UPNG.decode(pngArray);
      const rgba = UPNG.toRGBA8(decoded);
      const pixels = new Uint8ClampedArray(rgba[0]);

      pixelDataRef.current = pixels;

      // Create base texture
      const baseTexture = createTexture(gl, pixels, decoded.width, decoded.height);
      if (!baseTexture) {
        throw new Error("Failed to create base texture");
      }
      baseTextureRef.current = baseTexture;

      // Initialize empty overlay
      const overlayPixels = new Uint8ClampedArray(TARGET_SIZE * TARGET_SIZE * 4);
      overlayPixelsRef.current = overlayPixels;

      const overlayTexture = createTexture(gl, overlayPixels, TARGET_SIZE, TARGET_SIZE);
      if (!overlayTexture) {
        throw new Error("Failed to create overlay texture");
      }
      overlayTextureRef.current = overlayTexture;

      // Initial render
      render();

    } catch (err) {
      console.error("[GlColoringCanvas] Error:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [hybridKey, render]);

  // Handle touch
  const handleTouch = useCallback((event: any) => {
    if (!pixelDataRef.current || !glRef.current || !overlayTextureRef.current || !overlayPixelsRef.current) return;

    const { locationX, locationY } = event.nativeEvent;
    const layout = layoutRef.current;

    // Convert touch to bitmap coordinates
    const imageX = locationX - layout.offsetX;
    const imageY = locationY - layout.offsetY;

    if (imageX < 0 || imageX >= layout.displayWidth || imageY < 0 || imageY >= layout.displayHeight) return;

    const bitmapX = Math.floor((imageX / layout.displayWidth) * TARGET_SIZE);
    const bitmapY = Math.floor((imageY / layout.displayHeight) * TARGET_SIZE);

    // Check if clicking on outline
    const idx = (bitmapY * TARGET_SIZE + bitmapX) * 4;
    const r = pixelDataRef.current[idx];
    const g = pixelDataRef.current[idx + 1];
    const b = pixelDataRef.current[idx + 2];

    if (r < 50 && g < 50 && b < 50) return; // Black outline

    // Perform flood-fill
    const fillColor = hexToRgba(selectedColor);
    const workingPixels = new Uint8ClampedArray(pixelDataRef.current);
    floodFill(workingPixels, TARGET_SIZE, TARGET_SIZE, bitmapX, bitmapY, fillColor, 20);
    pixelDataRef.current = workingPixels;

    // Create overlay (filter out white/black)
    const overlayPixels = overlayPixelsRef.current;
    overlayPixels.fill(0); // Clear overlay

    for (let i = 0; i < workingPixels.length; i += 4) {
      const r = workingPixels[i];
      const g = workingPixels[i + 1];
      const b = workingPixels[i + 2];

      // Skip white and black pixels
      if ((r > 240 && g > 240 && b > 240) || (r < 50 && g < 50 && b < 50)) {
        continue;
      }

      overlayPixels[i] = r;
      overlayPixels[i + 1] = g;
      overlayPixels[i + 2] = b;
      overlayPixels[i + 3] = 255;
    }

    // Update overlay texture directly (NO PNG ENCODING!)
    const gl = glRef.current;
    gl.bindTexture(gl.TEXTURE_2D, overlayTextureRef.current);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TARGET_SIZE, TARGET_SIZE, gl.RGBA, gl.UNSIGNED_BYTE, overlayPixels);

    // Re-render
    render();
  }, [selectedColor, render]);

  // Update layout when container size changes
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      const scale = Math.min(containerSize.width / TARGET_SIZE, containerSize.height / TARGET_SIZE);
      const displayWidth = TARGET_SIZE * scale;
      const displayHeight = TARGET_SIZE * scale;
      const offsetX = (containerSize.width - displayWidth) / 2;
      const offsetY = (containerSize.height - displayHeight) / 2;

      layoutRef.current = { offsetX, offsetY, scale, displayWidth, displayHeight };
    }
  }, [containerSize]);

  if (error) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.error}>Error: {error}</Text>
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
      {containerSize.width > 0 && containerSize.height > 0 ? (
        <>
          <GLView
            style={{ width: containerSize.width, height: containerSize.height }}
            onContextCreate={onContextCreate}
          />
          <View
            style={styles.touchOverlay}
            onStartShouldSetResponder={() => true}
            onResponderRelease={handleTouch}
          />
        </>
      ) : (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Loading...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  touchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  error: {
    color: "red",
    padding: 20,
  },
});
