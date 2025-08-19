/**
 * This is an env-guarded integration test for the builtin engine. It only runs if 
 * LITELLM_BASE_URL is set; otherwise it's skipped. It streams from the LiteLLM proxy 
 * and asserts we receive some tokens and a final status: "done".
 * 
 * ```sh
 * # required
 * export LITELLM_BASE_URL="https://your-litellm.example.com"
 * 
 * # optional
 * export LITELLM_MODEL="gpt-4o-mini"          # or whatever your proxy routes
 * export LITELLM_KEY="sk-..."                  # if your proxy expects bearer auth
 * # or use a JSON headers object:
 * # export LITELLM_HEADERS='{"Authorization":"Bearer sk-...","x-org":"team-abc"}'
 * ```
 */
import { describe, it, expect } from 'vitest';
import { createBuiltinEngine } from '../index.js';
import type { Delta } from '@react-llm-fiber/runtime';

const baseUrl = process.env.LITELLM_BASE_URL;
const model = process.env.LITELLM_MODEL; // optional override
// Optional auth/extra headers: either set LITELLM_HEADERS as a JSON object string,
// or set LITELLM_KEY to inject an Authorization bearer header.
const headers: Record<string, string> | undefined = (() => {
  const h = process.env.LITELLM_HEADERS;
  if (h) {
    try { return JSON.parse(h); } catch { /* fallthrough */ }
  }
  const key = process.env.LITELLM_KEY;
  return key ? { Authorization: `Bearer ${key}` } : undefined;
})();

const maybe = baseUrl ? it : it.skip;

describe('integration: LiteLLM streaming', () => {
  maybe('streams tokens and completes', async () => {
    const engine = createBuiltinEngine({
      baseUrl: baseUrl!,
      defaultModel: model,
      headers,
    });

    const handle = await engine.run({
      model,
      messages: [
        { role: 'system', content: 'You are concise.' },
        { role: 'user', content: 'Reply with the word: ok' },
      ],
    });

    const reader = handle.stream.getReader();
    let collected = '';
    let sawDone = false;

    // Per-test timeout guard (Vitest also enforces its own timeout)
    const deadline = Date.now() + 45_000;

    for (;;) {
      if (Date.now() > deadline) {
        handle.abort();
        throw new Error('Timed out waiting for stream output');
      }
      const { value, done } = await reader.read();
      if (done) break;

      const d = value as Delta;
      if (d.type === 'token') collected += d.chunk;
      if (d.type === 'status' && d.phase === 'done') sawDone = true;
      if (d.type === 'error') {
        // Surface engine/provider errors for easier debugging
        throw new Error(`${d.error.name}: ${d.error.message}`);
      }

      // Early exit if we already saw enough tokens
      if (collected.length >= 2 && /ok/i.test(collected)) {
        // Drain the stream so engine can close cleanly
        handle.abort();
        break;
      }
    }

    expect(collected.length).toBeGreaterThan(0);
    expect(sawDone).toBe(true);
  }, 60_000);
});
