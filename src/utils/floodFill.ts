// src/utils/floodFill.ts
export function floodFill(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  newCol: [number, number, number, number],
  tolerance = 16
) {
  const idx = (xx: number, yy: number) => (yy * w + xx) * 4;
  const start = idx(x, y);
  const target: [number, number, number, number] = [
    data[start],
    data[start + 1],
    data[start + 2],
    data[start + 3],
  ];

  // Don't fill if tapping on black outline
  // Black outline: RGB all < 50 (allowing for slight anti-aliasing)
  const isBlackOutline = target[0] < 50 && target[1] < 50 && target[2] < 50;
  if (isBlackOutline) return;

  // Already filled with this exact color? Skip.
  if (
    target[0] === newCol[0] &&
    target[1] === newCol[1] &&
    target[2] === newCol[2] &&
    target[3] === newCol[3]
  ) {
    return;
  }

  const nearly = (a: number, b: number) => Math.abs(a - b) <= tolerance;
  const isTarget = (i: number) =>
    nearly(data[i], target[0]) &&
    nearly(data[i + 1], target[1]) &&
    nearly(data[i + 2], target[2]) &&
    nearly(data[i + 3], target[3]);

  const [nr, ng, nb, na] = newCol;
  const stack: [number, number][] = [[x, y]];

  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    let ix = cx;
    let i = idx(ix, cy);

    // scan left
    while (ix >= 0 && isTarget(i)) {
      ix--;
      i -= 4;
    }
    ix++;
    i += 4;

    let spanUp = false;
    let spanDown = false;

    // scan right and fill
    while (ix < w && isTarget(i)) {
      data[i] = nr; data[i + 1] = ng; data[i + 2] = nb; data[i + 3] = na;

      if (cy > 0) {
        const iu = i - w * 4;
        if (!spanUp && isTarget(iu)) { stack.push([ix, cy - 1]); spanUp = true; }
        else if (spanUp && !isTarget(iu)) { spanUp = false; }
      }

      if (cy < h - 1) {
        const idn = i + w * 4;
        if (!spanDown && isTarget(idn)) { stack.push([ix, cy + 1]); spanDown = true; }
        else if (spanDown && !isTarget(idn)) { spanDown = false; }
      }

      ix++;
      i += 4;
    }
  }
}

export const hexToRgba = (hex: string): [number, number, number, number] => {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((ch) => ch + ch).join("");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return [r, g, b, 255];
};