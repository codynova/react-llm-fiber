/**
 * Small LiteLLM chat streaming helper.
 * 
 * It forwards the raw OpenAI-style chunk to the caller (onOpenAiChunk) and also 
 * emits compact wire deltas (tokens/status/meta) that the engine decodes to public Delta.
 */
import { type WireDelta, encodeDelta } from '@react-llm-fiber/runtime';
import { readSse } from './sse.js';

export type LiteChatBody = {
  model?: string;
  stream: true;
  messages: Array<any>;
  tools?: Array<any>;
} & Record<string, unknown>;

export const streamLiteLlmChat = async (opts: {
  baseUrl: string;
  headers?: Record<string, string>;
  body: LiteChatBody;
  signal?: AbortSignal;
  onDelta: (wire: WireDelta) => void;
  onOpenAiChunk: (payload: any) => void;
}) => {
  const res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(opts.headers ?? {}),
    },
    body: JSON.stringify(opts.body),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`LiteLLM error ${res.status}: ${await res.text().catch(() => '')}`);
  }

  await readSse(res.body, (obj) => {
    // OpenAI-style streaming payload:
    // { id, object:'chat.completion.chunk', choices:[{ delta: { content?: string, tool_calls?: [...] }, ... }], ... }
    if (obj === '[DONE]') return;
    if (typeof obj !== 'object' || !obj) return;

    opts.onOpenAiChunk(obj);

    try {
      const choice = obj?.choices?.[0];
      const delta = choice?.delta ?? {};
      const content = delta?.content;
      if (typeof content === 'string' && content.length > 0) {
        opts.onDelta(encodeDelta({ type: 'token', chunk: content }));
      }

      // (Optional) usage/meta — some proxies provide usage in-stream or at end. Best effort.
      const usage = obj?.usage ?? choice?.usage;
      if (usage && (usage.prompt_tokens != null || usage.completion_tokens != null)) {
        opts.onDelta(
          encodeDelta({
            type: 'meta',
            tokens: {
              prompt: usage.prompt_tokens,
              completion: usage.completion_tokens,
            },
          })
        );
      }
    } catch {
      // swallow parse irregularities; engine emits final error if fetch fails
    }
  });
};
