// assets/base/index.ts
import { Image } from "react-native";

const BASE_REQUIRE: Record<string, number> = {
  bear: require("./bear.png"),
  bunny: require("./bunny.png"),
  elephant: require("./elephant.png"),
  fox: require("./fox.png"),
  giraffe: require("./giraffe.png"),
  hippo: require("./hippo.png"),
  lion: require("./lion.png"),
  monkey: require("./monkey.png"),
  penguin: require("./penguin.png"),
  tiger: require("./tiger.png"),
  turtle: require("./turtle.png"),
  zebra: require("./zebra.png"),
};

// Export BASE_REQUIRE as BASE_SOURCES for compatibility with assetLoader
export const BASE_SOURCES = BASE_REQUIRE;

// Also export raw lookup map for filename-based access
export const RAW_BASE_LOOKUP = BASE_REQUIRE;

export const getBaseRequire = (animal: string) => BASE_REQUIRE[animal.toLowerCase()];

export const getBaseUri = (animal: string): string | undefined => {
  const mod = getBaseRequire(animal);
  if (!mod) return undefined;
  const src = Image.resolveAssetSource((mod as any).default ?? mod);
  return src?.uri;
};