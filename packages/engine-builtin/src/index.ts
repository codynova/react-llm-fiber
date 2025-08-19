import {
  type Engine,
  type RunHandle,
  type RunInput,
  type Delta,
  type ChatMessage,
  type ToolRuntime,
  type ToolSpec,
} from '@react-llm-fiber/runtime';
import { decodeDelta, encodeDelta } from '@react-llm-fiber/runtime';
import { streamLiteLlmChat } from './lite.js';
import { createWireStream } from './wire.js';
import { toOpenAiMessages, toOpenAiTools, safeJsonParse, makeId } from './util.js';

export type BuiltinEngineOptions = {
  /** LiteLLM proxy base URL, e.g. https://litellm.mycorp.com */
  baseUrl: string;
  /** Default model if none supplied per-run */
  defaultModel?: string;
  /** Optional headers to send to LiteLLM (auth, org, etc.) */
  headers?: Record<string, string>;
  /** Tool runtime; if omitted, tool calls will throw on execution */
  tools?: ToolRuntime;
};

export const createBuiltinEngine = (options: BuiltinEngineOptions): Engine => {
  const toolsRuntime: ToolRuntime | undefined = options.tools;

  const run = async (input: RunInput, runOptions?: { signal?: AbortSignal }): Promise<RunHandle> => {
    const id = makeId();
    const controller = new AbortController();
    const outerSignal = runOptions?.signal;
    if (outerSignal) {
      if (outerSignal.aborted) controller.abort();
      else outerSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    // 1) First pass: stream assistant; capture tool_calls if any
    const messages = toOpenAiMessages(input.messages);
    const tools = input.tools && input.tools.length ? toOpenAiTools(input.tools) : undefined;

    // A little structure to accumulate tool_calls across streaming chunks.
    type PendingToolCall = { id?: string; name?: string; args: string };
    const pendingTools: Record<number, PendingToolCall> = {};
    const orderedToolIndexes: number[] = [];

    const out = new ReadableStream<Delta>({
      start: async (ctrl) => {
        try {
          // Stream deltas from LiteLLM, converting OpenAI stream → public Delta (token/status) and tracking tool_calls
          await streamLiteLlmChat({
            baseUrl: options.baseUrl,
            headers: options.headers,
            body: {
              model: input.model ?? options.defaultModel,
              stream: true,
              messages,
              tools,
              // pass-through provider params if caller specified
              ...((input.params ?? {}) as Record<string, unknown>),
            },
            signal: controller.signal,
            onDelta: (wire) => {
              // Convert to public Delta for 'token' / (optional) 'meta' / 'status', and also sniff tool chunks
              // We only emit token/meta/status here; tool calls are executed after the first pass completes.
              const d = decodeDelta(wire);
              if (d.type === 'token' || d.type === 'meta' || d.type === 'status' || d.type === 'error') {
                ctrl.enqueue(d);
              }
            },
            onOpenAiChunk: (chunk) => {
              // Inspect OpenAI-style streaming delta structure to capture tool_calls pieces
              // Example: choices[0].delta.tool_calls[0].function.{ name | arguments }
              const choice = chunk?.choices?.[0];
              const delta = choice?.delta as any;
              const toolCalls: any[] | undefined = delta?.tool_calls;
              if (Array.isArray(toolCalls)) {
                for (const tc of toolCalls) {
                  const index: number = typeof tc.index === 'number' ? tc.index : 0;
                  if (!pendingTools[index]) {
                    pendingTools[index] = { args: '' };
                    orderedToolIndexes.push(index);
                  }
                  if (tc.id && !pendingTools[index].id) pendingTools[index].id = tc.id;
                  const fn = tc.function;
                  if (fn?.name) pendingTools[index].name = fn.name;
                  if (typeof fn?.arguments === 'string') pendingTools[index].args += fn.arguments;
                }
              }
            },
          });

          // 2) If tool_calls were requested, execute them in order and emit tool_call/tool_result deltas.
          if (orderedToolIndexes.length > 0) {
            for (const index of orderedToolIndexes) {
              const call = pendingTools[index];
              if (!call) throw Error(`Could not find pendingTools call for index ${index}`);
              const name = call.name ?? 'unknown_tool';
              const rawArgs = call.args ?? '';
              const parsedArgs = safeJsonParse(rawArgs);

              ctrl.enqueue({ type: 'tool_call', name, args: parsedArgs });

              if (!toolsRuntime) {
                ctrl.enqueue({
                  type: 'error',
                  error: {
                    name: 'ToolRuntimeMissing',
                    message: `Tool "${name}" was requested but no ToolRuntime is configured`,
                    code: 'tool_failure',
                  },
                });
                continue;
              }

              try {
                const result = await toolsRuntime.call(name, parsedArgs, { runId: id, signal: controller.signal });
                ctrl.enqueue({ type: 'tool_result', name, result });
              } catch (err: any) {
                ctrl.enqueue({
                  type: 'error',
                  error: { name: 'ToolExecutionError', message: String(err?.message ?? err), code: 'tool_failure' },
                });
              }
            }

            // 3) Second pass: ask model again with tool results appended, and stream final answer
            const toolMessages: ChatMessage[] = orderedToolIndexes.map((index) => {
              // If provider expects tool_call_id, try to include it; else just send content.
              const call = pendingTools[index];
              if (!call) throw Error(`Could not find pendingTools call for index ${index}`);
              const content = JSON.stringify({ ok: true, ...(call.args ? { input: safeJsonParse(call.args) } : {}) });
              // Our public ChatMessage doesn't carry 'tool_call_id'; providers will still use content.
              return { role: 'tool', content };
            });

            const secondMessages = toOpenAiMessages([...input.messages, ...toolMessages]);

            await streamLiteLlmChat({
              baseUrl: options.baseUrl,
              headers: options.headers,
              body: {
                model: input.model ?? options.defaultModel,
                stream: true,
                messages: secondMessages,
                // No tools on the second call by default; you can allow recursive tools if desired:
                // tools,
                ...((input.params ?? {}) as Record<string, unknown>),
              },
              signal: controller.signal,
              onDelta: (wire) => {
                const d = decodeDelta(wire);
                if (d.type === 'token' || d.type === 'meta' || d.type === 'status' || d.type === 'error') {
                  ctrl.enqueue(d);
                }
              },
              onOpenAiChunk: () => {
                /* no-op; don't track tool calls on second pass (MVP) */
              },
            });
          }

          // Final status (best-effort)
          ctrl.enqueue({ type: 'status', phase: 'done' });
          ctrl.close();
        } catch (err: any) {
          ctrl.enqueue({
            type: 'error',
            error: { name: err?.name ?? 'Error', message: String(err?.message ?? err) },
          });
          ctrl.close();
        }
      },
      cancel: () => controller.abort(),
    });

    const handle: RunHandle = {
      id,
      stream: out,
      abort: () => controller.abort(),
    };
    return handle;
  };

  return { run };
};

/** Simple in-process tool registry for early development */
export const createLocalToolRuntime = (): ToolRuntime => {
  const impls = new Map<string, (args: unknown, ctx: { runId: string; signal?: AbortSignal }) => Promise<unknown> | unknown>();
  const specs = new Map<string, ToolSpec>();

  const register = (spec: ToolSpec, impl?: (args: unknown, ctx: { runId: string; signal?: AbortSignal }) => Promise<unknown> | unknown) => {
    specs.set(spec.name, spec);
    if (impl) impls.set(spec.name, impl);
    return () => {
      specs.delete(spec.name);
      impls.delete(spec.name);
    };
  };

  const call = async (name: string, args: unknown, ctx: { runId: string; signal?: AbortSignal }) => {
    const fn = impls.get(name);
    if (!fn) throw new Error(`No tool implementation registered for "${name}"`);
    return await fn(args, ctx);
  };

  return { register, call };
};

export type { BuiltinEngineOptions as Options };
