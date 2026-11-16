import { ConfigError } from "./errors.js";

const NUMBERS = ["minTestSize", "minSliceSize", "maxSliceDropPoints", "minAdversarialAccuracy", "maxOverallDropPoints", "alpha", "minJudgePassRate", "maxUrgencyEce"];

/**
 * Validate eval.config.json. Throws ConfigError naming the bad key.
 * @param {any} raw
 */
export function parseConfig(raw) {
  if (!raw || typeof raw !== "object") throw new ConfigError("config must be an object");
  for (const k of ["seed", "bootstrapIterations"]) if (!Number.isInteger(raw[k]) || raw[k] <= 0) throw new ConfigError(`config.${k} must be a positive integer`);
  if (!raw.gate) throw new ConfigError("config.gate is missing");
  for (const k of NUMBERS) if (typeof raw.gate[k] !== "number") throw new ConfigError(`config.gate.${k} must be a number`);
  if (typeof raw.gate.requireSliceSignificance !== "boolean") throw new ConfigError("config.gate.requireSliceSignificance must be true or false");
  if (!raw.flakiness || !(raw.flakiness.runs >= 2) || !(raw.flakiness.temperature >= 0)) throw new ConfigError("config.flakiness needs runs >= 2 and temperature >= 0");
  return raw;
}
