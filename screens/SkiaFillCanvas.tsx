import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { View, LayoutChangeEvent, Image, type ViewStyle, type DimensionValue } from "react-native";
import {
  Canvas,
  Image as SkImageNode,
  useCanvasRef,
  Skia,
  rect,
  // Optional enums (may not exist on some builds; safe to import)
  ColorType as SkColorType,
  AlphaType as SkAlphaType,
} from "@shopify/react-native-skia";

import type { SkImage, SkData } from "@shopify/react-native-skia";

// RN-safe utils (no CanvasKit/WASM helpers)
import { loadHybridXml } from "../src/utils/assetLoader.native";
import { TARGET_W, TARGET_H } from "../src/utils/bitmapConverter"; // constants only
import { floodFill, hexToRgba } from "../src/utils/floodFill";

// Pure JS PNG codec that works in RN (no TextDecoder encodings needed)
// Minimal typing for UPNG (no @types available)
/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UPNG: any = require("upng-js");

const DEBUG = true;
const MIRROR_TO_RN_IMAGE = true; // also render PNG overlay via RN <Image> for guaranteed visibility while debugging
const log = (...a: any[]) => DEBUG && console.log("[FillDBG]", ...a);

// Ensure any Skia SkData/JSI data objects become a real Uint8Array for JS libs
function toUint8(b: any): Uint8Array {
  if (!b) return new Uint8Array(0);
  if (b instanceof Uint8Array) return b;
  try {
    if (typeof b.toArray === "function") return new Uint8Array(b.toArray());
  } catch {}
  try {
    if (typeof b.bytes === "function") return new Uint8Array(b.bytes());
  } catch {}
  try {
    if (b.buffer && typeof b.byteLength === "number") return new Uint8Array(b.buffer, b.byteOffset || 0, b.byteLength);
  } catch {}
  try {
    if (Array.isArray(b)) return new Uint8Array(b);
  } catch {}
  // last resort: copy iterable
  try {
    return Uint8Array.from(b as Iterable<number>);
  } catch {}
  return new Uint8Array(0);
}

// --- Helpers to keep fills inside the animal and ignore background taps ---
function lum(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
type Bounds = { minX: number; minY: number; maxX: number; maxY: number } | null;
function expand(b: Bounds, pad: number): Bounds {
  if (!b) return null;
  return {
    minX: Math.max(0, b.minX - pad),
    minY: Math.max(0, b.minY - pad),
    maxX: b.maxX + pad,
    maxY: b.maxY + pad,
  };
}
function inBounds(b: Bounds, x: number, y: number) {
  if (!b) return false;
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}
/**
 * Finds a loose bounding box around the animal strokes by scanning for dark (non-white)
 * pixels (alpha>200 and luminance<220). Returns null if nothing is found.
 */
function getStrokeBounds(buf: Uint8Array, w: number, h: number): Bounds {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    let row = y * w * 4;
    for (let x = 0; x < w; x++) {
      const i = row + x * 4;
      const a = buf[i + 3];
      if (a < 200) continue;
      const L = lum(buf[i], buf[i + 1], buf[i + 2]);
      if (L < 220) { // "dark-ish" = likely stroke
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX === -1) return null;
  return { minX, minY, maxX, maxY };
}

const TARGET_ASPECT = TARGET_W / TARGET_H;

/** Compute the letterboxed rect that fits TARGET_WxTARGET_H into the view size */
function getContentRect(viewW: number, viewH: number) {
  const viewAspect = viewW / viewH;
  let w = viewW;
  let h = viewH;
  if (viewAspect > TARGET_ASPECT) {
    // view is wider than art: pillarbox
    h = viewH;
    w = h * TARGET_ASPECT;
  } else {
    // view is taller than art: letterbox
    w = viewW;
    h = w / TARGET_ASPECT;
  }
  const x = (viewW - w) / 2;
  const y = (viewH - h) / 2;
  return { x, y, w, h };
}

type Props = {
  hybridKey?: string; // e.g. bear_bunny
  svgXml?: string; // optional raw xml (bypass loader)
  color: string;
  onDidPaint?: () => void;
  onUndo?: (hasMore: boolean) => void;
  onClear?: () => void;
  width?: number | string;
  height?: number | string;
};

type Snapshot = { png: SkData };
export type SkiaFillCanvasHandle = { undo: () => void; clear: () => void };

const SkiaFillCanvas = forwardRef<SkiaFillCanvasHandle, Props>(function SkiaFillCanvas(
  { hybridKey, svgXml, color, onDidPaint, onUndo, onClear, width = "100%", height = "100%" },
  ref
) {
  const canvasRef = useCanvasRef();
  const [size, setSize] = useState({ w: TARGET_W, h: TARGET_H });

  // Vector base (rasterized SkImage) and paintable overlay image
  const [baseImage, setBaseImage] = useState<SkImage | null>(null);
  const [overlayImage, setOverlayImage] = useState<SkImage | null>(null);
  const [overlayUri, setOverlayUri] = useState<string | null>(null);

  const undoStack = useRef<Snapshot[]>([]);

  // Load & parse the SVG, rasterize to SkImage, and extract RGBA buffer
  const baseRGBARef = useRef<Uint8Array | null>(null);
  const paintRGBARef = useRef<Uint8Array | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        log("loading base...");
        const xml = svgXml ?? (hybridKey ? await loadHybridXml(hybridKey) : "");
        if (!xml) throw new Error("No svgXml provided");
        // Create raster surface
        const MakeOffscreen = (Skia as any)?.Surface?.MakeOffscreen || (Skia as any)?.Surface?.Make || (Skia as any)?.Surface?.MakeRaster;
        if (!MakeOffscreen) throw new Error("No Skia.Surface.MakeOffscreen available");
        const surf = MakeOffscreen(TARGET_W, TARGET_H);
        const c = surf.getCanvas();
        // Fill white background
        const bg = Skia.Paint();
        bg.setColor(Skia.Color("#FFFFFFFF"));
        c.drawRect(rect(0, 0, TARGET_W, TARGET_H), bg);
        // Parse SVG and render
        const svg = Skia.SVG.MakeFromString(xml);
        if (!svg) throw new Error("Skia.SVG.MakeFromString failed");
        // Center/scale like before
        const svgW = (svg as any)?.width?.() || TARGET_W;
        const svgH = (svg as any)?.height?.() || TARGET_H;
        const s = Math.min(TARGET_W / svgW, TARGET_H / svgH);
        const bx = (TARGET_W - svgW * s) / 2;
        const by = (TARGET_H - svgH * s) / 2;
        c.save();
        c.translate(bx, by);
        c.scale(s, s);
        const pic = (svg as any)?.getPicture?.();
        if (pic) c.drawPicture(pic);
        else (svg as any)?.render?.(c);
        c.restore();
        // Snapshot
        const snap = surf.makeImageSnapshot();
        setBaseImage(snap);
        // Encode to PNG and decode with UPNG to get RGBA buffer
        const enc = snap.encodeToBytes();
        const pngBytes = toUint8(enc);
        const upng = UPNG.decode(pngBytes);
        const frames = UPNG.toRGBA8(upng);
        baseRGBARef.current = new Uint8Array(frames[0]);
        // Initialize paint buffer (all zeros)
        paintRGBARef.current = new Uint8Array(TARGET_W * TARGET_H * 4);
        // Clear overlay/undo
        setOverlayImage(null);
        setOverlayUri(null);
        undoStack.current = [];
        onUndo?.(false);
        log("base ready");
      } catch (e) {
        console.warn("[skia] base load error", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hybridKey, svgXml, onUndo]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0 && h > 0) setSize({ w, h });
  };

  const saveUndo = useCallback(async () => {
    try {
      const MakeOffscreen = (Skia as any)?.Surface?.MakeOffscreen || (Skia as any)?.Surface?.Make;
      if (!MakeOffscreen) return;
      const surf = MakeOffscreen(TARGET_W, TARGET_H);
      const c = surf.getCanvas();

      // start transparent
      const paint = Skia.Paint();
      paint.setColor(Skia.Color("#00000000"));
      c.drawRect(rect(0, 0, TARGET_W, TARGET_H), paint);

      if (overlayImage) {
        const p = Skia.Paint();
        c.drawImageRect(
          overlayImage,
          rect(0, 0, overlayImage.width(), overlayImage.height()),
          rect(0, 0, TARGET_W, TARGET_H),
          p
        );
      }
      else if (overlayUri) {
        // If we only have a RN-image overlay, try to load it into Skia for snapshot
        try {
          const res = await fetch(overlayUri);
          const buf = await res.arrayBuffer();
          const sk = Skia.Data.fromBytes(new Uint8Array(buf));
          const img = Skia.Image.MakeImageFromEncoded(sk);
          if (img) {
            const p2 = Skia.Paint();
            c.drawImageRect(
              img,
              rect(0, 0, img.width(), img.height()),
              rect(0, 0, TARGET_W, TARGET_H),
              p2
            );
          }
        } catch {}
      }
      const snap = surf.makeImageSnapshot();
      const png = snap.encodeToBytes();
      undoStack.current.push({ png });
      onUndo?.(true);
    } catch {
      // ignore
    }
  }, [overlayImage, overlayUri, onUndo]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) {
      onUndo?.(false);
      return;
    }
    // drop current
    undoStack.current.pop();
    const prev = undoStack.current[undoStack.current.length - 1];
    if (!prev) {
      setOverlayImage(null);
      setOverlayUri(null);
      onUndo?.(false);
      return;
    }
    const img = Skia.Image.MakeImageFromEncoded(prev.png);
    if (img) {
      setOverlayImage(img);
      setOverlayUri(null);
    } else {
      // fallback: keep previous RN overlay if any
      setOverlayImage(null);
      // no stored uri in this snapshot format; clear to none
      setOverlayUri(null);
    }
    onUndo?.(undoStack.current.length > 0);
  }, [onUndo]);

  const clear = useCallback(() => {
    undoStack.current = [];
    setOverlayImage(null);
    setOverlayUri(null);
    onClear?.();
  }, [onClear]);

  useImperativeHandle(ref, () => ({ undo, clear }), [undo, clear]);

  // Fill handler: render base SVG + overlay to offscreen -> read pixels -> flood fill -> new overlay

  const drawToSurface = useCallback(
    (surf: any) => {
      const c = surf.getCanvas();
      // clear to transparent, then white background so flood-fill sees white interiors
      const clearPaint = Skia.Paint();
      clearPaint.setColor(Skia.Color("#00000000"));
      c.drawRect(rect(0, 0, TARGET_W, TARGET_H), clearPaint);
      const bg = Skia.Paint();
      bg.setColor(Skia.Color("#FFFFFFFF"));
      c.drawRect(rect(0, 0, TARGET_W, TARGET_H), bg);
      // Draw raster base image
      if (baseImage) {
        const p = Skia.Paint();
        c.drawImageRect(
          baseImage,
          rect(0, 0, baseImage.width(), baseImage.height()),
          rect(0, 0, TARGET_W, TARGET_H),
          p
        );
      }
      // Overlay image (already at TARGET size)
      if (overlayImage) {
        const p = Skia.Paint();
        c.drawImageRect(
          overlayImage,
          rect(0, 0, overlayImage.width(), overlayImage.height()),
          rect(0, 0, TARGET_W, TARGET_H),
          p
        );
      }
    },
    [baseImage, overlayImage]
  );

  const handleTap = useCallback(
    async ({ x, y }: { x: number; y: number }) => {
      try {
        if (!baseImage) return;

        // Prefer raster/CPU surfaces so pixel IO is supported across builds
        const SurfaceAny: any = (Skia as any)?.Surface || {};
        const makeSurfaceFn =
          SurfaceAny.MakeRaster?.bind(SurfaceAny) ||
          SurfaceAny.MakeRasterN32Premul?.bind(SurfaceAny) ||
          SurfaceAny.MakeCPU?.bind(SurfaceAny) ||
          SurfaceAny.MakeOffscreen?.bind(SurfaceAny) ||
          SurfaceAny.Make?.bind(SurfaceAny);
        if (!makeSurfaceFn) {
          console.warn("[skia] no Surface factory available");
          return;
        }
        const surf = makeSurfaceFn(TARGET_W, TARGET_H);

        // Render base + overlay to an offscreen surface at TARGET size
        drawToSurface(surf);

        // Snapshot & pull pixels
        const snap = surf.makeImageSnapshot();
        const w = (snap as any).width?.() ?? TARGET_W;
        const h = (snap as any).height?.() ?? TARGET_H;

        // Map screen tap → TARGET pixels via the same visible rect
        const nx = x / size.w; // normalized within the canvas bounds
        const ny = y / size.h;
        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
        const px = Math.max(0, Math.min(w - 1, Math.round(nx * w)));
        const py = Math.max(0, Math.min(h - 1, Math.round(ny * h)));

        // Read pixels (several fallbacks across RN‑Skia builds)
        const bpp = 4;
        const buffer = new Uint8Array(w * h * bpp);
        let ok = false;
        try {
          // Try reading directly from the surface first (some builds allow this)
          try {
            const surfAny: any = surf as any;
            if (surfAny && typeof surfAny.readPixels === "function" && !ok) {
              ok = surfAny.readPixels(buffer, 0, 0, w, h) === true ||
                   surfAny.readPixels(0, 0, w, h, buffer) === true ||
                   surfAny.readPixels(buffer) === true;
            }
            const canvasAny: any = surfAny?.getCanvas?.();
            if (canvasAny && typeof canvasAny.readPixels === "function" && !ok) {
              ok = canvasAny.readPixels(buffer, 0, 0, w, h) === true ||
                   canvasAny.readPixels(0, 0, w, h, buffer) === true ||
                   canvasAny.readPixels(buffer) === true;
            }
          } catch {}

          const imgAny: any = snap as any;

          // 1) RN‑Skia modern: readPixels(dst, srcX, srcY, width, height)
          if (typeof imgAny.readPixels === "function" && !ok) {
            try {
              ok = imgAny.readPixels(buffer, 0, 0, w, h) === true;
            } catch {}
          }

          // 2) Alt signature: readPixels(srcX, srcY, width, height, dst)
          if (typeof imgAny.readPixels === "function" && !ok) {
            try {
              ok = imgAny.readPixels(0, 0, w, h, buffer) === true;
            } catch {}
          }

          // 3) Simplest signature: readPixels(dst)
          if (typeof imgAny.readPixels === "function" && !ok) {
            try {
              ok = imgAny.readPixels(buffer) === true;
            } catch {}
          }

          // 4) peekPixels -> pixmap.readPixels(dst)
          if (!ok && typeof imgAny.peekPixels === "function") {
            const pixmap = imgAny.peekPixels();
            if (pixmap && typeof pixmap.readPixels === "function") {
              try {
                ok = pixmap.readPixels(buffer) === true;
              } catch {}
            }
          }

          // 5) As a last resort, re-decode a PNG snapshot and try again
          if (!ok && typeof imgAny.encodeToBytes === "function") {
            try {
              const enc = imgAny.encodeToBytes();
              const dec: any = (Skia as any)?.Image?.MakeImageFromEncoded?.(enc);
              if (dec && typeof dec.readPixels === "function") {
                ok = dec.readPixels(buffer, 0, 0, w, h) === true ||
                     dec.readPixels(0, 0, w, h, buffer) === true ||
                     dec.readPixels(buffer) === true;
              }
            } catch {}
          }
        } catch (e) {
          console.warn("[skia] readPixels error", e);
        }
        console.log("[FillDBG] readPixels ok:", ok);
        if (!ok) {
          // -------- PNG round-trip fallback (no readPixels support) --------
          try {
            const encBytes = (snap as any)?.encodeToBytes?.();
            if (!encBytes) {
              console.warn("[skia] encodeToBytes unavailable – cannot fallback to PNG decode");
              return;
            }
            // Decode PNG to raw RGBA in JS (UPNG.js)
            const pngBytes = toUint8(encBytes);
            const upng = UPNG.decode(pngBytes);
            const dw = (upng as any).width as number;
            const dh = (upng as any).height as number;
            const frames = UPNG.toRGBA8(upng); // returns ArrayBuffers
            const before = new Uint8Array(frames[0]); // RGBA BEFORE fill

            // Compute fill coordinates in decoded space
            const dpx = Math.max(0, Math.min(dw - 1, Math.round((px / w) * dw)));
            const dpy = Math.max(0, Math.min(dh - 1, Math.round((py / h) * dh)));

            // Ignore taps clearly outside the animal bounds (background)
            const bounds = expand(getStrokeBounds(before, dw, dh), 12);
            if (!inBounds(bounds, dpx, dpy)) {
              console.log("[FillDBG] tap outside bounds – ignored");
              return;
            }

            // Run flood fill on a working copy
            const filled = new Uint8Array(before); // copy
            const rgba = hexToRgba(color);
            const TOLERANCE = 24;
            floodFill(filled as unknown as Uint8ClampedArray, dw, dh, dpx, dpy, rgba, TOLERANCE);

            // Build an overlay buffer that only contains the newly colored pixels,
            // and throw away fills that are suspiciously large (likely background).
            const overlayBuf = new Uint8Array(dw * dh * 4);
            const NEAR_WHITE = 245;
            let changed = 0;
            for (let i = 0; i < overlayBuf.length; i += 4) {
              const r0 = before[i], g0 = before[i+1], b0 = before[i+2], a0 = before[i+3];
              const r1 = filled[i], g1 = filled[i+1], b1 = filled[i+2], a1 = filled[i+3];
              const becameTarget = (r1 === rgba[0] && g1 === rgba[1] && b1 === rgba[2] && a1 === rgba[3]);
              const wasNearWhite = (r0 >= NEAR_WHITE && g0 >= NEAR_WHITE && b0 >= NEAR_WHITE && a0 >= 200);
              if (becameTarget && wasNearWhite && (r0 !== r1 || g0 !== g1 || b0 !== b1 || a0 !== a1)) {
                overlayBuf[i] = r1; overlayBuf[i+1] = g1; overlayBuf[i+2] = b1; overlayBuf[i+3] = a1;
                changed++;
              } else {
                overlayBuf[i] = overlayBuf[i+1] = overlayBuf[i+2] = overlayBuf[i+3] = 0;
              }
            }
            const MAX_FRACTION = 0.12; // 12% of canvas max for a single fill
            if (changed > dw * dh * MAX_FRACTION) {
              console.log("[FillDBG] fill too large – discarded", changed, "/", dw*dh);
              return;
            }

            // Try Skia Image from PNG-encoded overlay (keeps alpha)
            try {
              const rePngBuf = UPNG.encode([overlayBuf.buffer], dw, dh, 0);
              const skBuf = Skia.Data.fromBytes(toUint8(rePngBuf));
              const newImg = (Skia as any)?.Image?.MakeImageFromEncoded?.(skBuf);
              if (newImg) {
                await saveUndo();
                console.log("[FillDBG] overlay image set (PNG encoded overlay)");
                setOverlayImage(newImg);
                setOverlayUri(null);
                onDidPaint?.();
                console.log("[FillDBG] fill applied, changed px:", changed);
                return;
              }
            } catch {}

            // RN Image fallback (data URI) if Skia creation fails
            try {
              const rePngBuf = UPNG.encode([overlayBuf.buffer], dw, dh, 0);
              const u8 = (rePngBuf instanceof Uint8Array) ? rePngBuf : new Uint8Array(rePngBuf as ArrayBuffer);
              let s = "";
              const CHUNK = 0x8000;
              for (let i = 0; i < u8.length; i += CHUNK) {
                s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK) as unknown as number[]);
              }
              // @ts-ignore btoa is polyfilled in RN
              const base64 = btoa(s);
              const uri = `data:image/png;base64,${base64}`;
              await saveUndo();
              console.log("[FillDBG] overlay image set (RN PNG overlay)");
              setOverlayImage(null);
              setOverlayUri(uri);
              onDidPaint?.();
              console.log("[FillDBG] fill applied, changed px:", changed);
              return;
            } catch (err) {
              console.warn("[skia] PNG overlay fallback (RN Image) failed", err);
              return;
            }
          } catch (e) {
            console.warn("[skia] PNG fallback failed", e);
            return;
          }
        }

        // Normal path: we have pixels in `buffer`
        {
          const rgba = hexToRgba(color);
          const TOLERANCE = 24; // reduced to prevent leakage into anti-aliased edges
          // Preserve a copy BEFORE fill so we can derive a transparent overlay of *only* colored pixels
          const before = new Uint8Array(buffer);
          // Ignore taps clearly outside the animal bounds (background)
          const bounds = expand(getStrokeBounds(before, w, h), 12);
          if (!inBounds(bounds, px, py)) {
            console.log("[FillDBG] tap outside bounds – ignored");
            return;
          }
          floodFill(buffer as unknown as Uint8ClampedArray, w, h, px, py, rgba, TOLERANCE);

          // Build overlay-only buffer (transparent elsewhere), and guard against giant fills
          const overlayBuf = new Uint8Array(w * h * bpp);
          const NEAR_WHITE = 245;
          let changed = 0;
          for (let i = 0; i < overlayBuf.length; i += 4) {
            const r0 = before[i], g0 = before[i+1], b0 = before[i+2], a0 = before[i+3];
            const r1 = buffer[i], g1 = buffer[i+1], b1 = buffer[i+2], a1 = buffer[i+3];
            const becameTarget = (r1 === rgba[0] && g1 === rgba[1] && b1 === rgba[2] && a1 === rgba[3]);
            const wasNearWhite = (r0 >= NEAR_WHITE && g0 >= NEAR_WHITE && b0 >= NEAR_WHITE && a0 >= 200);
            if (becameTarget && wasNearWhite && (r0 !== r1 || g0 !== g1 || b0 !== b1 || a0 !== a1)) {
              overlayBuf[i] = r1; overlayBuf[i+1] = g1; overlayBuf[i+2] = b1; overlayBuf[i+3] = a1;
              changed++;
            } else {
              overlayBuf[i] = overlayBuf[i+1] = overlayBuf[i+2] = overlayBuf[i+3] = 0;
            }
          }
          const MAX_FRACTION = 0.12;
          if (changed > w * h * MAX_FRACTION) {
            console.log("[FillDBG] fill too large – discarded", changed, "/", w*h);
            return;
          }

          // Create Skia image from the overlay buffer
          let newImg: any = null;
          try {
            const info = {
              width: w,
              height: h,
              colorType: (Skia as any)?.ColorType?.RGBA_8888 ?? 6,
              alphaType: (Skia as any)?.AlphaType?.Unpremul ?? 1,
            };
            newImg = ((Skia as any)?.Image?.MakeImageFromPixels || (Skia as any)?.Image?.MakeRasterImage)?.(
              info,
              overlayBuf,
              w * bpp
            );
          } catch (e) {
            console.warn("[skia] MakeImageFromPixels (overlay) failed", e);
          }

          await saveUndo();

          // Also mirror overlay to RN Image so the change is visible even if Skia fails to draw
          const setMirrorUri = () => {
            try {
              const rePngBuf = UPNG.encode([ overlayBuf.buffer ], w, h, 0);
              const u8 = (rePngBuf instanceof Uint8Array) ? rePngBuf : new Uint8Array(rePngBuf as ArrayBuffer);
              let s = "";
              const CHUNK = 0x8000;
              for (let i = 0; i < u8.length; i += CHUNK) {
                s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK) as unknown as number[]);
              }
              // @ts-ignore
              const base64 = btoa(s);
              const uri = `data:image/png;base64,${base64}`;
              console.log("[FillDBG] overlay image set (RN PNG mirror overlay)");
              setOverlayUri(uri);
            } catch (err) {
              console.warn("[skia] RN PNG mirror (overlay) failed", err);
            }
          };

          if (newImg) {
            console.log("[FillDBG] overlay image set (overlay pixels)");
            setOverlayImage(newImg);
            if (MIRROR_TO_RN_IMAGE) setMirrorUri(); else setOverlayUri(null);
            onDidPaint?.();
            console.log("[FillDBG] fill applied, changed px:", changed);
          } else {
            console.warn("[skia] MakeImageFromPixels returned null overlay image");
            if (MIRROR_TO_RN_IMAGE) setMirrorUri();
          }
        }
      } catch (e) {
        console.warn("[skia] handleTap error", e);
      }
    },
    [baseImage, size, color, drawToSurface, onDidPaint, saveUndo]
  );

const containerStyle = React.useMemo<ViewStyle>(() => {
  const s: ViewStyle = {};
  if (typeof width !== "undefined") {
    s.width = width as DimensionValue;
  }
  if (typeof height !== "undefined") {
    s.height = height as DimensionValue;
  }
  return s;
}, [width, height]);

  return (
    <View style={containerStyle} onLayout={handleLayout}>
      <Canvas ref={canvasRef} style={{ flex: 1 }}>
        {baseImage && (
        <SkImageNode
            image={baseImage}
            x={0}
            y={0}
            width={size.w}
            height={size.h}
        />
        )}
        {overlayImage && (
        <SkImageNode
            image={overlayImage}
            x={0}
            y={0}
            width={size.w}
            height={size.h}
        />
        )}
      </Canvas>

      {overlayUri && (
        <View
            pointerEvents="none"
            style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 10 }}
        >
            <Image
            source={{ uri: overlayUri }}
            resizeMode="contain"
            style={{ width: "100%", height: "100%" }}
            />
        </View>
    )}

      {/* Reliable RN touch overlay */}
      <View
        pointerEvents="box-only"
        style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
        onStartShouldSetResponder={() => true}
        onResponderRelease={(e) => {
          const { locationX, locationY } = e.nativeEvent as any;
          log("tap", locationX, locationY);
          handleTap({ x: locationX, y: locationY });
        }}
      />
    </View>
  );
});

export default SkiaFillCanvas;