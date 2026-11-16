import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseTestSet } from "../src/testset.js";
import { parseRatings } from "../src/ratings.js";
import { parseConfig } from "../src/config.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Read the shipped data files. Paths can be overridden for experiments. */
export function loadAll({ testset = "data/testset.jsonl", ratings = "data/human-ratings.jsonl", config = "eval.config.json" } = {}) {
  const read = (p) => fs.readFileSync(path.resolve(ROOT, p), "utf8");
  return { cases: parseTestSet(read(testset)), ratings: parseRatings(read(ratings)), config: parseConfig(JSON.parse(read(config))) };
}
