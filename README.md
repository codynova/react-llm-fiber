# react-llm-fiber

A React reconciler for LLMs

## Mental model

Like react-three-fiber maps JSX to a scene graph, react-llm-fiber maps JSX to a **prompt graph**:

* **Nodes**: system prompts, messages, memories, tools, constraints, schemas.
* **Edges**: data dependencies between nodes (e.g., tool outputs feeding the next call).
* The reconciler diffs this graph and performs the **minimal set of LLM calls** or tool invocations needed to bring reality in sync with your JSX. Streaming slots render as they arrive and can participate in Suspense/Transitions.

---

## Hello world (minimal chat)

```tsx
import {
  LLMProvider, Chat, System, User, Assistant, Stream, Composer
} from "react-llm-fiber";

export default function App() {
  return (
    <LLMProvider model="gpt-4.1-mini" baseUrl="/api/llm" maxTokens={400}>
      <Chat id="support" historyKey="local">
        <System>You are a concise, helpful customer support agent.</System>

        <Assistant>
          <Stream /> {/* live token stream renders here */}
        </Assistant>

        <Composer placeholder="Ask me anything…" />
      </Chat>
    </LLMProvider>
  );
}
```

**What happens**

* `<Chat>` is a stateful root for messages (SSR + client).
* On submit from `<Composer>`, the reconciler diffs the tree, composes the prompt, and starts a streaming completion.
* `<Stream>` subscribes to the active response and progressively renders tokens.
* History persists via `historyKey`.

---

## Tool calling (typed, zero ceremony)

```tsx
import { Tool, z, Chat, System, User, Assistant, Stream } from "react-llm-fiber";

const SearchTool = (
  <Tool
    name="search"
    schema={z.object({ q: z.string(), k: z.number().default(5) })}
    onCall={async ({ q, k }) => {
      const results = await mySearch(q, k);
      return results.map(r => ({ title: r.title, url: r.url, snippet: r.snippet }));
    }}
  />
);

export default function Agent() {
  return (
    <Chat id="research">
      <System>Use the "search" tool to find current information before answering.</System>
      {SearchTool}
      <User>Compare React Server Components vs. tRPC for data fetching.</User>
      <Assistant>
        <Stream />
      </Assistant>
    </Chat>
  );
}
```

**DX details**

* Tools are **first-class nodes**. They’re registered/unregistered via reconciliation (hot-reload safe).
* `schema` is Zod; the reconciler validates/normalizes tool call arguments and gives you **typed params** in `onCall`.
* Tool calls appear in `<Stream>` as inline “function call” events (handy for devtools).

---

## Multi-agent planner/executor (plan |> act |> reflect)

```tsx
import {
  Agent, Goal, Context, Tools, Planner, Executor, Critic, Memory, Score,
  Tool
} from "react-llm-fiber";

export function IssueTriage({ issue }: { issue: GithubIssue }) {
  return (
    <Agent name="triage" strategy="plan-execute" temperature={0.2}>
      <Goal>Triaging GitHub issues: summarize, label, decide priority.</Goal>

      <Context>
        {issue.title}
        {"\n\n"}
        {issue.body}
      </Context>

      <Tools>
        <Tool name="label" schema={{ tag: "string" }} onCall={({ tag }) => addLabel(issue.id, tag)} />
        <Tool name="comment" schema={{ body: "string" }} onCall={({ body }) => comment(issue.id, body)} />
      </Tools>

      <Memory scope="project:ui" writeBack />

      <Planner n={2} />       {/* proposes steps */}
      <Executor parallel={false} />  {/* performs steps (tool calls & model calls) */}
      <Critic model="gpt-4o-mini" /> {/* evaluates/edits the answer */}
      <Score target="≤ 80 tokens" />
    </Agent>
  );
}
```

**Why JSX here?**
You **declare** your agent topology; the reconciler turns it into a directed graph with a transactional run. If `<Tools>` changes, only the affected parts re-run. `Memory` becomes an addressable vector store keyed by `scope`, and `writeBack` lets the agent store useful facts.

---

## RAG without glue code

```tsx
import { RAG, Index, Retriever, Chat, System, User, Assistant, Stream } from "react-llm-fiber";

export default function DocsBot({ docs }: { docs: Array<{id: string, text: string}> }) {
  return (
    <RAG>
      <Index name="handbook" source={docs} chunkSize={800} overlap={100} />
      <Retriever index="handbook" k={6} />

      <Chat id="handbook-bot">
        <System>Answer using the company handbook. If uncertain, say so.</System>
        <User>How do we request a design review?</User>
        <Assistant>
          <Stream showContext /> {/* will render highlighted retrieved chunks */}
        </Assistant>
      </Chat>
    </RAG>
  );
}
```

The reconciler:

* Builds/updates the index incrementally.
* Injects retrieved passages as **context slots** (deduped, token-budget aware).
* Invalidates only the nodes affected when `docs` change.

---

## Choice sampling with Suspense & Transitions

```tsx
import { Choices, Choice, Best, Judge } from "react-llm-fiber";

export function SubjectLine({ brief }: { brief: string }) {
  return (
    <Choices id="subject" onErrorBoundary={<div>Couldn’t draft</div>}>
      <Choice temperature={0.8} />
      <Choice temperature={0.3} />
      <Choice topP={0.6} />
      <Judge criteria="click-through likelihood" />
      <Best>
        {({ text }) => <span>{text}</span>}
      </Best>
    </Choices>
  );
}
```

This runs three variants, judges them with a (cheap) model, and renders the winner. The reconciler **shares** the base prompt tokens across choices to save costs.

---

## Core hooks

All hooks are isomorphic (Node/Edge/Browser). Types below are indicative.

```ts
// 1) Low-level access to the active client/model
function useLLM(): {
  client: { complete, chat, embed, moderate, abortAll: () => void };
  model: string;
  setModel: (m: string) => void;
};

// 2) Fire-and-stream completion (SSR-ready)
function useCompletion(opts: {
  prompt: string;
  stream?: boolean;
  temperature?: number;
  schema?: ZodSchema<any>;   // response JSON schema, auto-validates + auto-retries
  onDelta?: (chunk: string) => void;
}): {
  status: "idle"|"running"|"done"|"error";
  text: string;              // full text as it streams
  error?: Error;
  start: () => void;         // can be wrapped in startTransition
  cancel: () => void;
};

// 3) Chat state + send
function useChat(id: string): {
  messages: Array<{ role: "system"|"user"|"assistant"|"tool", content: string }>;
  send: (input: string | { toolCall?: ToolCall }) => Promise<void>;
  streamingText: string;
  abort: () => void;
};

// 4) Register a tool (typed)
function useTool<T extends z.ZodTypeAny>(
  name: string,
  schema: T,
  impl: (input: z.infer<T>, ctx: ToolContext) => Promise<any> | any
): { name: string, deregister: () => void };

// 5) Vector index
function useIndex(name: string): {
  upsert: (docs: Array<{ id: string; text: string; meta?: any }>) => Promise<void>;
  search: (q: string, k?: number) => Promise<Array<{ id: string; text: string; score: number; meta?: any }>>;
};

// 6) Guardrails/moderation
function useGuardrails(opts?: {
  moderationModel?: string;
  blockedCategories?: Array<"self-harm"|"violence"|"sexual"|"pii">;
}): {
  check: (text: string) => Promise<{ allowed: boolean; reasons?: string[] }>;
};

// 7) Planning
function usePlan(opts: { goal: string; tools?: string[]; depth?: number }): {
  steps: Array<{ id: string; title: string; done: boolean }>;
  execute: (id?: string) => Promise<void>; // single step or all
};

// 8) Cost & tokens (for budgets and dashboards)
function useCost(): {
  promptTokens: number; completionTokens: number; dollars: number;
  reset: () => void;
};

// 9) Tracing/devtools
function useTrace(): {
  spans: Array<TraceSpan>; // each LLM call/tool call/stream chunk
  export: () => Promise<Blob>;
};

// 10) Memory
function useMemory(scope: string): {
  get: (key: string) => Promise<any | undefined>;
  set: (key: string, value: any, ttlMs?: number) => Promise<void>;
  search: (q: string, k?: number) => Promise<Array<{ value: any; score: number }>>;
};
```

---

## Library primitives (JSX components)

* `<LLMProvider>`: model, transport, retry/backoff, caching, safety defaults.
* `<Chat> / <System> / <User> / <Assistant>`: declarative conversational structure.
* `<Stream>`: live token rendering, shows tool calls/function-call arguments inline; supports `as` prop to render into `<textarea/>`, `<pre/>`, etc.
* `<Tool>`: typed function calling; can be nested under agents/chats.
* `<Agent>` with `<Goal> <Context> <Tools> <Planner> <Executor> <Critic> <Score>`: build agent graphs compositionally.
* `<RAG> <Index> <Retriever>`: managed vector indexing and retrieval slots.
* `<Choices> <Choice> <Judge> <Best>`: N-best sampling with programmable selection.
* `<Guardrails>`: wraps any subtree to enforce moderation/schemas/regex constraints.
* `<Budget maxUSD={...}>`: will suspend/throw if a subtree would exceed budget.
* `<SwitchModel>`: route models by rules (latency, token size, pathnames, A/B).

All components are “**diff-aware**”: updates only re-run the minimal affected calls and share prompt prefixes automatically.

---

## Benefits

1. **Declarative orchestration** – Compose prompts, tools, memory, safety, and multi-model routing in JSX instead of bespoke glue code.
2. **Fine-grained updates** – React’s diff means you only re-issue calls for changed inputs; subtrees cache by value/identity.
3. **Streaming as first-class UI** – `<Stream>` integrates with Suspense/Transitions. Optimistic UI works out of the box.
4. **Types all the way down** – Zod-validated tool calls, schema-constrained responses with automatic retry/coercion.
5. **Deterministic dev** – Seeded sampling, snapshotable runs, trace exports for tests and audits.
6. **Cost control** – Built-in token/cost meters, budgets, shared prefixes across sampled branches.
7. **Server + Client** – Isomorphic hooks; transport pluggable (Edge, Node, worker).
8. **Hot-reload safe** – Tools/agents register/deregister through reconciliation, not global singletons.
9. **Testability** – Replace `<LLMProvider transport="mock">` to replay traces or fixtures; your components don’t change.
10. **Devtools** – A React DevTools panel listing spans, prompts, latencies, tool I/O, and token costs; click to jump to JSX node.

---

## Runtime behavior & React niceties

* **Suspense**: wrap long-running agent sections; fallback shows skeletons while retrieval or planning happens.
* **Transitions**: wrap `send()` or `start()` to keep UI responsive while streaming.
* **Offscreen**: pre-warm branches (e.g., generate both concise and verbose answers offscreen; reveal later).
* **AbortController**: every call is cancellable; the reconciler aborts orphaned calls when nodes unmount.
* **Cache keys**: stable object identity + content hashing yield cache hits across hot reloads.
* **Speculative**: optional speculative decoding (client) or prefix-cache (server) to cut TTFB.

---

## Example: multi-turn form helper (schema-constrained)

```tsx
import { Chat, System, User, Assistant, Stream, Guardrails } from "react-llm-fiber";
import { z } from "zod";

const FormSchema = z.object({
  title: z.string().min(3),
  fields: z.array(z.object({
    label: z.string(),
    type: z.enum(["text", "email", "tel", "textarea"]),
    required: z.boolean().default(false)
  })).max(6)
});

export function FormDesigner() {
  return (
    <Guardrails schema={FormSchema}>
      <Chat id="designer">
        <System>
          Produce strictly valid JSON matching the provided schema. Do not include prose.
        </System>
        <User>Create a 3-field contact form for a sales lead.</User>
        <Assistant>
          <Stream as="pre" />
        </Assistant>
      </Chat>
    </Guardrails>
  );
}
```

`<Guardrails schema>` handles parsing and retry with “self-healing” prompts if the first pass doesn’t validate.

---

## Example: routing by size/latency/budget

```tsx
import { SwitchModel, useCompletion } from "react-llm-fiber";

function Summarize({ text }: { text: string }) {
  return (
    <SwitchModel
      rules={[
        { when: ({ tokens }) => tokens < 300, use: "small-fast" },
        { when: ({ latencyMs }) => latencyMs > 1200, fallback: "medium" },
        { default: "quality" }
      ]}
    >
      <Summarizer text={text} />
    </SwitchModel>
  );
}

function Summarizer({ text }: { text: string }) {
  const { text: out, start, status } = useCompletion({
    prompt: `Summarize:\n\n${text}`, stream: true
  });
  return (
    <div>
      <button onClick={start} disabled={status === "running"}>Summarize</button>
      <pre>{out}</pre>
    </div>
  );
}
```

---

## Testing & DX

* **Snapshots**: `render(<Agent … />).toLLMTrace()` gives you a deterministic JSON trace (with seeds) for CI.
* **Fixtures**: `LLMProvider transport="mock" fixtures={…}` for offline runs.
* **ESLint rules**: prevent “unkeyed streams”, missing `<System>`, unsafe string interpolation, or unguarded PII.
* **Type-safe tools**: inferred from Zod; misuse is a compile error.
* **Devtools**: open the “LLM” tab alongside Components/Profiler; inspect prompts, tool results, retries, and costs.

---

## What the reconciler actually “commits”

* Adds/removes **tools** to the runtime registry.
* Rebuilds the **prompt graph** for a subtree and computes **diffs**.
* Starts/cancels **LLM calls** with streaming sinks bound to `<Stream>` nodes.
* Writes to **memory/index nodes** (vector store) and schedules invalidations.
* Emits **trace spans** for each operation (for devtools and budgets).

---

If you want, I can sketch the reconciler host config (what methods implement `appendChild`, `commitUpdate`, etc.) and a thin server transport you can drop behind `/api/llm`.
