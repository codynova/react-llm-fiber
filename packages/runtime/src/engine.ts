// packages/runtime/src/engine.ts

import type { Delta } from './delta.js';
import type { ChatMessage } from './transport.js';
import type { ToolSpec } from './tools.js';

export type RunHandle = {
  /** Unique run id (used for resume/replay/audit) */
  id: string;
  /** Stream of deltas (tokens, tool events, meta, etc.) */
  stream: ReadableStream<Delta>;
  /** Abort this run */
  abort: () => void;
}

export type RunInput = {
  model?: string;
  messages: ChatMessage[];
  tools?: ToolSpec[];
  params?: Record<string, unknown>;
};

export type AgentGraphInput = {
  /** Opaque graph representation (engine-specific). Keep generic for now. */
  nodes: any[];
  edges: any[];
};

export type Engine = {
  /** Single-turn or streaming chat run */
  run: (input: RunInput, options?: { signal?: AbortSignal }) => Promise<RunHandle>;

  /** Optional: multi-step/agentic flow (LangGraph, etc.) */
  agent?: (
    graph: AgentGraphInput,
    options?: { signal?: AbortSignal }
  ) => Promise<RunHandle>;

  /** Optional: reattach to a durable run */
  resume?: (id: string) => Promise<RunHandle | null>;
}
