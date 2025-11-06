// Static requires so Metro bundles the SVGs.
// Keys here can be in any order; we normalize below.
const RAW: Record<string, number> = {
  // bear_*
  bear_bunny: require("./bear_bunny.svg"),
  bear_elephant: require("./bear_elephant.svg"),
  bear_fox: require("./bear_fox.svg"),
  bear_giraffe: require("./bear_giraffe.svg"),
  bear_hippo: require("./bear_hippo.svg"),
  bear_lion: require("./bear_lion.svg"),
  bear_monkey: require("./bear_monkey.svg"),
  bear_penguin: require("./bear_penguin.svg"),
  bear_tiger: require("./bear_tiger.svg"),
  bear_turtle: require("./bear_turtle.svg"),
  bear_zebra: require("./bear_zebra.svg"),

  // bunny_*
  bunny_elephant: require("./bunny_elephant.svg"),
  bunny_fox: require("./bunny_fox.svg"),
  bunny_giraffe: require("./bunny_giraffe.svg"),
  bunny_hippo: require("./bunny_hippo.svg"),
  bunny_lion: require("./bunny_lion.svg"),
  bunny_monkey: require("./bunny_monkey.svg"),
  bunny_penguin: require("./bunny_penguin.svg"),
  bunny_tiger: require("./bunny_tiger.svg"),
  bunny_turtle: require("./bunny_turtle.svg"),
  bunny_zebra: require("./bunny_zebra.svg"),

  // elephant_*
  elephant_fox: require("./elephant_fox.svg"),
  elephant_giraffe: require("./elephant_giraffe.svg"),
  elephant_hippo: require("./elephant_hippo.svg"),
  elephant_lion: require("./elephant_lion.svg"),
  elephant_monkey: require("./elephant_monkey.svg"),
  elephant_penguin: require("./elephant_penguin.svg"),
  elephant_tiger: require("./elephant_tiger.svg"),
  elephant_turtle: require("./elephant_turtle.svg"),
  elephant_zebra: require("./elephant_zebra.svg"),

  // fox_*
  fox_giraffe: require("./fox_giraffe.svg"),
  fox_hippo: require("./fox_hippo.svg"),
  fox_lion: require("./fox_lion.svg"),
  fox_monkey: require("./fox_monkey.svg"),
  fox_penguin: require("./fox_penguin.svg"),
  fox_tiger: require("./fox_tiger.svg"),
  fox_turtle: require("./fox_turtle.svg"),
  fox_zebra: require("./fox_zebra.svg"),

  // giraffe_*
  giraffe_hippo: require("./giraffe_hippo.svg"),
  giraffe_lion: require("./giraffe_lion.svg"),
  giraffe_monkey: require("./giraffe_monkey.svg"),
  giraffe_penguin: require("./giraffe_penguin.svg"),
  giraffe_tiger: require("./giraffe_tiger.svg"),
  giraffe_turtle: require("./giraffe_turtle.svg"),
  giraffe_zebra: require("./giraffe_zebra.svg"),

  // hippo_*
  hippo_lion: require("./hippo_lion.svg"),
  hippo_monkey: require("./hippo_monkey.svg"),
  hippo_penguin: require("./hippo_penguin.svg"),
  hippo_tiger: require("./hippo_tiger.svg"),
  hippo_turtle: require("./hippo_turtle.svg"),
  hippo_zebra: require("./hippo_zebra.svg"),

  // lion_*
  lion_monkey: require("./lion_monkey.svg"),
  lion_penguin: require("./lion_penguin.svg"),
  lion_tiger: require("./lion_tiger.svg"),
  lion_turtle: require("./lion_turtle.svg"),
  lion_zebra: require("./lion_zebra.svg"),

  // monkey_*
  monkey_penguin: require("./monkey_penguin.svg"),
  monkey_tiger: require("./monkey_tiger.svg"),
  monkey_turtle: require("./monkey_turtle.svg"),
  monkey_zebra: require("./monkey_zebra.svg"),

  // penguin_*
  penguin_tiger: require("./penguin_tiger.svg"),
  penguin_turtle: require("./penguin_turtle.svg"),
  penguin_zebra: require("./penguin_zebra.svg"),

  // tiger_*
  tiger_turtle: require("./tiger_turtle.svg"),
  tiger_zebra: require("./tiger_zebra.svg"),

  // turtle_*
  turtle_zebra: require("./turtle_zebra.svg"),
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