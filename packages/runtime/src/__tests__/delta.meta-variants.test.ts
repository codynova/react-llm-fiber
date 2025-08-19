import { describe, it, expect } from 'vitest';
import { encodeDelta, decodeDelta, type Delta } from '../delta.js';

describe('Delta status/meta variants', () => {
  it('encodes/decodes all status phases', () => {
    const phases = ['plan', 'execute', 'critic', 'done'] as const;
    for (const phase of phases) {
      const d: Delta = { type: 'status', phase };
      expect(decodeDelta(encodeDelta(d))).toEqual(d);
    }
  });

  it('meta with only prompt or only completion tokens round-trips', () => {
    const promptOnly: Delta = { type: 'meta', tokens: { prompt: 5 } };
    const completionOnly: Delta = { type: 'meta', tokens: { completion: 7 } };
    expect(decodeDelta(encodeDelta(promptOnly))).toEqual(promptOnly);
    expect(decodeDelta(encodeDelta(completionOnly))).toEqual(completionOnly);
  });
});
