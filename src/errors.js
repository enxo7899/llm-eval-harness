/** Base class for every error the harness raises on purpose. */
export class HarnessError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}
/** The test set or ratings file is malformed. */
export class TestSetError extends HarnessError {}
/** eval.config.json is missing a value or has a bad one. */
export class ConfigError extends HarnessError {}
/** A candidate returned something that is not a valid triage result. */
export class CandidateError extends HarnessError {}
/** A real HTTP adapter failed (missing key, bad status, bad JSON). */
export class AdapterError extends HarnessError {}
