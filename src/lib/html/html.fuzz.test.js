// @vitest-environment happy-dom
/**
 * Randomised safety test for the html tag: generates templates mixing tricky
 * static markup with holes in every position, fills the holes with hostile
 * values, and checks the parsed DOM for anything injected. Templates that
 * html rejects (throws) count as safe. See fuzz.js.
 *
 * Reproduce a failure with: FUZZ_SEED=<seed> npx vitest run html.fuzz
 */
import { describe, it, expect } from 'vitest';
import { run } from './fuzz.js';

const ITERATIONS = Number(process.env.FUZZ_ITERATIONS) || 20000;
const SEED = Number(process.env.FUZZ_SEED) || 20261013;

describe('html (randomised)', () => {
  it(`never lets interpolated values inject markup (seed ${SEED}, ${ITERATIONS} cases)`, () => {
    const { accepted, failure } = run(document, { seed: SEED, iterations: ITERATIONS });

    if (failure) expect.fail(failure);

    // Guard against a generator that only produces rejected templates
    expect(accepted).toBeGreaterThan(ITERATIONS * 0.3);
  });
});
