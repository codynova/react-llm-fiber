import { describe, it, expect } from 'vitest';
import {
  type Delta,
  type WireDelta,
  encodeDelta,
  decodeDelta,
  isTokenDelta,
  isMetaDelta
} from '../delta.js';

describe('Delta encode/decode', () => {
  it('round-trips token', () => {
    const d: Delta = { type: 'token', chunk: 'hello' };
    const w = encodeDelta(d);
    expect(w).toEqual<WireDelta>({ t: 'token', c: 'hello' });
    const back = decodeDelta(w);
    expect(back).toEqual(d);
    expect(isTokenDelta(back)).toBe(true);
  });

  it('round-trips tool_call', () => {
    const d: Delta = { type: 'tool_call', name: 'search', args: { q: 'react' } };
    const w = encodeDelta(d);
    expect(w).toEqual<WireDelta>({ t: 'tool_call', n: 'search', a: { q: 'react' } });
    const back = decodeDelta(w);
    expect(back).toEqual(d);
  });

  it('round-trips tool_result', () => {
    const d: Delta = { type: 'tool_result', name: 'search', result: [{ title: 'x' }] };
    const w = encodeDelta(d);
    expect(w).toEqual<WireDelta>({ t: 'tool_result', n: 'search', r: [{ title: 'x' }] });
    const back = decodeDelta(w);
    expect(back).toEqual(d);
  });

  it('round-trips meta with tokens & cost', () => {
    const d: Delta = { type: 'meta', tokens: { prompt: 12, completion: 34 }, costUSD: 0.0023 };
    const w = encodeDelta(d);
    expect(w).toEqual<WireDelta>({ t: 'meta', pt: 12, ct: 34, $: 0.0023 });
    const back = decodeDelta(w);
    expect(back).toEqual(d);
    expect(isMetaDelta(back)).toBe(true);
  });

  it('omits tokens when undefined', () => {
    const d: Delta = { type: 'meta', costUSD: 0.01 };
    const w = encodeDelta(d);
    // pt/ct may be undefined properties; the decoder should omit tokens
    const back = decodeDelta(w);
    expect(back).toEqual<Delta>({ type: 'meta', costUSD: 0.01 });
  });

  it('round-trips status & error', () => {
    const s: Delta = { type: 'status', phase: 'execute' };
    const se = encodeDelta(s);
    expect(decodeDelta(se)).toEqual(s);

    const e: Delta = { type: 'error', error: { name: 'X', message: 'boom', code: 'parse' } };
    const we = encodeDelta(e);
    expect(decodeDelta(we)).toEqual(e);
  });

  it('wire JSON is smaller than public JSON (indicative)', () => {
    const pub: Delta = { type: 'tool_call', name: 'calc', args: { a: 1, b: 2 } };
    const wire = encodeDelta(pub);
    const pubJson = JSON.stringify(pub);
    const wireJson = JSON.stringify(wire);
    expect(wireJson.length).toBeLessThan(pubJson.length);
  });
});
