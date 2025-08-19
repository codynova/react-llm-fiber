import { describe, it, expect } from 'vitest';
import { createBuiltinEngine, createLocalToolRuntime } from '../index.js';

describe('engine-builtin', () => {
  it('constructs with minimal options', () => {
    const engine = createBuiltinEngine({ baseUrl: 'https://example.com' });
    expect(engine.run).toBeTypeOf('function');
  });

  it('local tool runtime registers and calls', async () => {
    const tools = createLocalToolRuntime();
    const dereg = tools.register({ name: 'echo' }, async (args) => args);
    const out = await tools.call('echo', { x: 1 }, { runId: 'r1' });
    expect(out).toEqual({ x: 1 });
    dereg();
  });
});
