import { describe, it, expect } from 'vitest';
import type { Delta } from '../delta.js';

describe('Delta discriminated union DX', () => {
  const handle = (d: Delta) => {
    switch (d.type) {
      case 'token':
        return d.chunk.length;
      case 'tool_call':
        return d.name;
      case 'tool_result':
        return d.result;
      case 'meta':
        return d.tokens?.prompt ?? 0;
      case 'status':
        return d.phase;
      case 'error':
        return d.error.code ?? 'E';
    }
  };

  it('narrowing compiles and returns something', () => {
    expect(handle({ type: 'status', phase: 'done' })).toBe('done');
    expect(handle({ type: 'token', chunk: 'x' })).toBe(1);
  });
});
