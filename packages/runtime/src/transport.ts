import type { Delta } from './delta';
import type { ToolSpec } from './tools';

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'tool'; content: string };

export type ChatParams = {
  model?: string;
  messages: ChatMessage[];
  tools?: ToolSpec[];
  /** Provider-specific params (temperature, topP, maxTokens, etc.) */
  params?: Record<string, unknown>;
  signal?: AbortSignal;
};

/** Streaming transport contract (LiteLLM-backed in the builtin engine) */
export type Transport = {
  chat: (params: ChatParams) => Promise<ReadableStream<Delta>>;
  embed?: (
    texts: string[],
    opts?: { model?: string; signal?: AbortSignal }
  ) => Promise<number[][]>;
}
