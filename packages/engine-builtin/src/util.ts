/**
 * Helpers: message/tool mapping to OpenAI schema, safe JSON parse, and id generator.
 */
import type { ChatMessage, ToolSpec } from '@react-llm-fiber/runtime';

export const toOpenAiMessages = (msgs: ChatMessage[]) =>
  msgs.map((m) => ({ role: m.role, content: m.content }));

export const toOpenAiTools = (tools: ToolSpec[]) =>
  tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      // If you pass a Zod JSON Schema or JSON Schema object via ToolSpec.schema
      // LiteLLM (OpenAI-compatible) expects a JSON Schema object here.
      parameters: t.schema ?? { type: 'object', properties: {}, additionalProperties: true },
    },
  }));

export const safeJsonParse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return text; // fall back to raw string; the tool may accept it
  }
};

export const makeId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `run_${Math.random().toString(36).slice(2)}`;
};
