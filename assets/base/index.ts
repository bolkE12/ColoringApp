// assets/base/index.ts
import { Asset } from "expo-asset";
// No longer using expo-file-system's deprecated APIs. Using fetch() for reading SVG XML.
import { Image } from "react-native";

const BASE_REQUIRE: Record<string, number> = {
  bear: require("./bear.svg"),
  bunny: require("./bunny.svg"),
  elephant: require("./elephant.svg"),
  fox: require("./fox.svg"),
  giraffe: require("./giraffe.svg"),
  hippo: require("./hippo.svg"),
  lion: require("./lion.svg"),
  monkey: require("./monkey.svg"),
  penguin: require("./penguin.svg"),
  tiger: require("./tiger.svg"),
  turtle: require("./turtle.svg"),
  zebra: require("./zebra.svg"),
};

export const getBaseRequire = (animal: string) => BASE_REQUIRE[animal.toLowerCase()];

export const getBaseUri = (animal: string): string | undefined => {
  const mod = getBaseRequire(animal);
  if (!mod) return undefined;
  const src = Image.resolveAssetSource((mod as any).default ?? mod);
  return src?.uri;
};

export const getBaseXmlAsync = async (animal: string): Promise<string | undefined> => {
  const mod = getBaseRequire(animal);
  if (!mod) return undefined;

  try {
    const source = Image.resolveAssetSource((mod as any).default ?? mod);
    let uri = source?.uri;

    if (!uri && typeof mod === "number") {
      const asset = Asset.fromModule(mod);
      await asset.downloadAsync();
      uri = asset.localUri ?? asset.uri;
    }

    if (!uri) return undefined;

    const res = await fetch(uri);
    if (!res.ok) {
      console.warn(`[base] fetch failed for ${animal} at ${uri} (status ${res.status})`);
      return undefined;
    }
    return await res.text();
  } catch (e) {
    console.warn(`[base] load xml failed for ${animal}:`, e);
    return undefined;
  }
};