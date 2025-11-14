// Static requires so Metro bundles the PNGs.
// Keys here can be in any order; we normalize below.
const RAW: Record<string, number> = {
  // bear_*
  bear_bunny: require("./bear_bunny.png"),
  bear_elephant: require("./bear_elephant.png"),
  bear_fox: require("./bear_fox.png"),
  bear_giraffe: require("./bear_giraffe.png"),
  bear_hippo: require("./bear_hippo.png"),
  bear_lion: require("./bear_lion.png"),
  bear_monkey: require("./bear_monkey.png"),
  bear_penguin: require("./bear_penguin.png"),
  bear_tiger: require("./bear_tiger.png"),
  bear_turtle: require("./bear_turtle.png"),
  bear_zebra: require("./bear_zebra.png"),

  // bunny_*
  bunny_elephant: require("./bunny_elephant.png"),
  bunny_fox: require("./bunny_fox.png"),
  bunny_giraffe: require("./bunny_giraffe.png"),
  bunny_hippo: require("./bunny_hippo.png"),
  bunny_lion: require("./bunny_lion.png"),
  bunny_monkey: require("./bunny_monkey.png"),
  bunny_penguin: require("./bunny_penguin.png"),
  bunny_tiger: require("./bunny_tiger.png"),
  bunny_turtle: require("./bunny_turtle.png"),
  bunny_zebra: require("./bunny_zebra.png"),

  // elephant_*
  elephant_fox: require("./elephant_fox.png"),
  elephant_giraffe: require("./elephant_giraffe.png"),
  elephant_hippo: require("./elephant_hippo.png"),
  elephant_lion: require("./elephant_lion.png"),
  elephant_monkey: require("./elephant_monkey.png"),
  elephant_penguin: require("./elephant_penguin.png"),
  elephant_tiger: require("./elephant_tiger.png"),
  elephant_turtle: require("./elephant_turtle.png"),
  elephant_zebra: require("./elephant_zebra.png"),

  // fox_*
  fox_giraffe: require("./fox_giraffe.png"),
  fox_hippo: require("./fox_hippo.png"),
  fox_lion: require("./fox_lion.png"),
  fox_monkey: require("./fox_monkey.png"),
  fox_penguin: require("./fox_penguin.png"),
  fox_tiger: require("./fox_tiger.png"),
  fox_turtle: require("./fox_turtle.png"),
  fox_zebra: require("./fox_zebra.png"),

  // giraffe_*
  giraffe_hippo: require("./giraffe_hippo.png"),
  giraffe_lion: require("./giraffe_lion.png"),
  giraffe_monkey: require("./giraffe_monkey.png"),
  giraffe_penguin: require("./giraffe_penguin.png"),
  giraffe_tiger: require("./giraffe_tiger.png"),
  giraffe_turtle: require("./giraffe_turtle.png"),
  giraffe_zebra: require("./giraffe_zebra.png"),

  // hippo_*
  hippo_lion: require("./hippo_lion.png"),
  hippo_monkey: require("./hippo_monkey.png"),
  hippo_penguin: require("./hippo_penguin.png"),
  hippo_tiger: require("./hippo_tiger.png"),
  hippo_turtle: require("./hippo_turtle.png"),
  hippo_zebra: require("./hippo_zebra.png"),

  // lion_*
  lion_monkey: require("./lion_monkey.png"),
  lion_penguin: require("./lion_penguin.png"),
  lion_tiger: require("./lion_tiger.png"),
  lion_turtle: require("./lion_turtle.png"),
  lion_zebra: require("./lion_zebra.png"),

  // monkey_*
  monkey_penguin: require("./monkey_penguin.png"),
  monkey_tiger: require("./monkey_tiger.png"),
  monkey_turtle: require("./monkey_turtle.png"),
  monkey_zebra: require("./monkey_zebra.png"),

  // penguin_*
  penguin_tiger: require("./penguin_tiger.png"),
  penguin_turtle: require("./penguin_turtle.png"),
  penguin_zebra: require("./penguin_zebra.png"),

  // tiger_*
  tiger_turtle: require("./tiger_turtle.png"),
  tiger_zebra: require("./tiger_zebra.png"),

  // turtle_*
  turtle_zebra: require("./turtle_zebra.png"),
};

// Normalize keys so lookups are order-insensitive & lowercase.
function normalizeKey(k: string) {
  const parts = k.split("_").map((s) => s.toLowerCase()).sort();
  return parts.join("_");
}

const normEntries = Object.entries(RAW).map(
  ([k, v]) => [normalizeKey(k), v] as const
);

export const HYBRID_SOURCES: Record<string, number> =
  Object.fromEntries(normEntries);

// Also export the raw mapping in case callers pass filename-ish keys
export const RAW_HYBRID_LOOKUP: Record<string, number> = RAW;

// Optional convenience
export const HYBRID_KEYS = Object.keys(HYBRID_SOURCES);