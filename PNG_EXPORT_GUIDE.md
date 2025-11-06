# PNG Export Guide for Coloring Functionality

## Format Specification

To ensure seamless coloring functionality, export all hybrid animal SVGs to PNG with these exact specifications:

### **Required Specifications:**

| Property | Value | Notes |
|----------|-------|-------|
| **Size** | 1024 × 1024 pixels | Exact dimensions |
| **Format** | PNG | 24-bit RGB or 32-bit RGBA |
| **Interior regions** | `RGB(255, 255, 255)` | Pure white |
| **Outline/borders** | `RGB(0, 0, 0)` | Pure black |
| **Background** | `RGB(255, 255, 255)` | Same as interior |
| **Opacity** | 255 (100%) | All pixels fully opaque |
| **Transparency** | None | No transparent pixels |

### **Visual Structure:**

```
┌─────────────────────────────────┐
│ WHITE BACKGROUND (255,255,255)  │
│   ┌─────────────────────────┐   │
│   │ BLACK OUTLINE (0,0,0) ──│   │
│   │  ┌─────────────────┐    │   │
│   │  │ WHITE INTERIOR  │    │   │
│   │  │  (255,255,255)  │    │   │
│   │  │  [colorable]    │    │   │
│   │  └─────────────────┘    │   │
│   └─────────────────────────┘   │
└─────────────────────────────────┘
```

---

## Export Methods

### **Method 1: Inkscape (Recommended)**

1. Open your SVG in Inkscape
2. Select all elements that should be colorable
3. Set fill to pure white: `#FFFFFF`
4. Select all outline/stroke elements
5. Set stroke to pure black: `#000000` with appropriate width (e.g., 4-8px)
6. Go to **File → Export PNG Image**
7. Set:
   - Width: `1024` px
   - Height: `1024` px
   - DPI: `96`
8. Export

**Verification in Inkscape:**
- Use the eyedropper tool to verify colors are exactly `#FFFFFF` and `#000000`
- Check "Document Properties" to ensure canvas is 1024×1024

---

### **Method 2: Adobe Illustrator**

1. Open SVG in Illustrator
2. Set artboard to 1024×1024 (Object → Artboards → Artboard Options)
3. Select interior regions → Fill: White (`#FFFFFF`), Stroke: None
4. Select outline paths → Fill: None, Stroke: Black (`#000000`), Width: 4-8pt
5. Background: Create a white rectangle (1024×1024) on bottom layer
6. Go to **File → Export → Export As**
7. Choose PNG format
8. Options:
   - Resolution: 72 ppi (or higher for 1024px output)
   - Color Mode: RGB
   - Background: White
   - Anti-aliasing: Art Optimized (Supersampling)
9. Export

---

### **Method 3: GIMP (Free)**

1. Open SVG in GIMP
2. Set import size to 1024×1024
3. Use selection tools to select interior regions
4. Fill with white: `#FFFFFF`
5. Select outline regions
6. Fill with black: `#000000` or use stroke
7. Flatten image (Image → Flatten Image)
8. Export as PNG:
   - **File → Export As**
   - Choose `.png` extension
   - Compression level: 9 (maximum)
9. Export

---

### **Method 4: Figma/Sketch**

1. Import SVG to canvas
2. Set canvas size: 1024×1024
3. For each colorable region:
   - Fill: `#FFFFFF`
   - Stroke: None
4. For outlines:
   - Fill: None
   - Stroke: `#000000`, Weight: 4-8px
5. Add white background rectangle (1024×1024)
6. Export:
   - Format: PNG
   - Scale: 1x (for 1024px output)
   - Export settings: include "Outline stroke"

---

### **Method 5: Command Line (ImageMagick)**

If you have SVGs already formatted correctly:

```bash
# Convert SVG to PNG with white background
convert -background white -flatten \
  -resize 1024x1024 \
  -quality 100 \
  input.svg output.png

# Ensure pure white/black values (threshold)
convert output.png \
  -threshold 95% \
  output_clean.png
```

---

### **Method 6: Web-based (vectorpaint.yaks.co.nz)**

1. Upload SVG
2. Adjust canvas to 1024×1024
3. Use fill tool to make interiors white
4. Use stroke tool to make outlines black
5. Export as PNG (1024×1024)

---

## Verification Checklist

After exporting each PNG, verify:

- [ ] Dimensions are exactly 1024×1024 pixels
- [ ] Interior regions are pure white (RGB 255, 255, 255)
- [ ] Outlines are pure black (RGB 0, 0, 0)
- [ ] No transparency/alpha channel issues
- [ ] No gray anti-aliasing around outlines (or minimal)
- [ ] File size is reasonable (<150KB per file)

### **Quick Verification Script:**

```bash
# Check PNG dimensions
identify -format "%wx%h" monkey_zebra.png
# Should output: 1024x1024

# Check for transparency (should say "srgb" not "srgba")
identify -verbose monkey_zebra.png | grep Colorspace
# Should output: Colorspace: sRGB
```

---

## Batch Conversion

If you have many SVGs to convert:

### **Bash script (with Inkscape CLI):**

```bash
#!/bin/bash
for svg in assets/hybrid/*.svg; do
  filename=$(basename "$svg" .svg)
  inkscape "$svg" \
    --export-type=png \
    --export-filename="assets/hybrid/${filename}.png" \
    --export-width=1024 \
    --export-height=1024 \
    --export-background=white
done
```

### **Python script (with cairosvg):**

```python
import cairosvg
import os

svg_dir = "assets/hybrid/"
for svg_file in os.listdir(svg_dir):
    if svg_file.endswith('.svg'):
        svg_path = os.path.join(svg_dir, svg_file)
        png_path = os.path.join(svg_dir, svg_file.replace('.svg', '.png'))
        cairosvg.svg2png(
            url=svg_path,
            write_to=png_path,
            output_width=1024,
            output_height=1024,
            background_color='white'
        )
```

---

## After Exporting All PNGs

### **1. Add to assets/hybrid/index.ts:**

```typescript
const RAW_PNG: Record<string, number> = {
  monkey_zebra: require("./monkey_zebra.png"),
  bear_fox: require("./bear_fox.png"),
  lion_tiger: require("./lion_tiger.png"),
  // ... add all 66 hybrid PNGs here
};
```

### **2. Test each one:**

Navigate through the app and test each hybrid combination to ensure:
- PNG loads correctly
- Coloring fills regions properly
- Outlines remain intact
- No lag or performance issues

---

## Troubleshooting

### **Issue: Colors bleeding outside boundaries**
- **Cause:** Outlines are not pure black or too thin
- **Fix:** Increase outline thickness to 6-8px and ensure RGB(0,0,0)

### **Issue: Can't fill certain regions**
- **Cause:** Regions are not fully enclosed by black outlines
- **Fix:** Check for gaps in outlines, close all paths

### **Issue: Fills the entire image**
- **Cause:** No black outlines detected
- **Fix:** Verify outlines are RGB(0,0,0) and have proper stroke width

### **Issue: Gray artifacts around edges**
- **Cause:** Anti-aliasing during export
- **Fix:** Adjust export settings or use threshold filter in post-processing

---

## Need Help?

If you encounter issues with the conversion, check the console logs in the app:

```
[PngColoringCanvas] Bitmap analysis:
  - Black pixels (outline): ??? ← Should be > 50,000
  - White pixels (colorable): ??? ← Should be > 500,000
```

If black pixels = 0, the PNG doesn't have proper outlines.
If white pixels = 0, the PNG might be transparent or colored incorrectly.
