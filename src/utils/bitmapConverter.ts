// src/utils/bitmapConverter.ts
import { Skia, rect } from "@shopify/react-native-skia";

export const TARGET_W = 1024;
export const TARGET_H = 1024;

export function svgXmlToImage(svgXml: string) {
  const skSvg = (Skia as any)?.SVG?.MakeFromString?.(svgXml);
  if (!skSvg) throw new Error("[skia] SVG.MakeFromString failed");

  // Offscreen surface
  const MakeOffscreen = (Skia as any)?.Surface?.MakeOffscreen || (Skia as any)?.Surface?.Make;
  if (!MakeOffscreen) throw new Error("[skia] Surface.MakeOffscreen unavailable");

  const surf = MakeOffscreen(TARGET_W, TARGET_H);
  if (!surf) throw new Error("[skia] MakeOffscreen failed");

  const canvas = surf.getCanvas();

  // Clear to white (so white interiors are real pixels)
  try {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#FFFFFFFF"));
    canvas.drawRect(rect(0, 0, TARGET_W, TARGET_H), paint);
  } catch {}

  // Draw the vector
  try {
    const picture = skSvg.getPicture?.(TARGET_W, TARGET_H);
    if (picture) canvas.drawPicture(picture);
  } catch {}

  const image = surf.makeImageSnapshot();
  return image;
}