import { describe, it, expect } from 'vitest';
import { LlmError, normalizeError } from '../errors.js';

describe('LlmError & normalizeError', () => {
  it('passes through LlmError', () => {
    const e = new LlmError('rate_limit', 'Too many requests');
    expect(normalizeError(e)).toBe(e);
  });

  it('maps AbortError to aborted', () => {
    const abortLike = { name: 'AbortError', message: 'The operation was aborted.' };
    const n = normalizeError(abortLike);
    expect(n.code).toBe('aborted');
    expect(n.message).toMatch(/aborted/i);
  });

  it('classifies common messages', () => {
    expect(normalizeError('rate limit exceeded').code).toBe('rate_limit');
    expect(normalizeError('auth failed: bad key').code).toBe('auth');
    expect(normalizeError('content policy violation').code).toBe('content_policy');
    expect(normalizeError('request timeout').code).toBe('timeout');
    expect(normalizeError('network down').code).toBe('network');
    expect(normalizeError('json parse error').code).toBe('parse');
  });

  it('falls back to unknown', () => {
    const n = normalizeError({ foo: 'bar' });
    expect(n.code).toBe('unknown');
  });
});
