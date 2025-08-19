# react-llm-fiber — Development Checklist (updated)

## 0) Monorepo & Scaffolding

* [x] Initialize Nx + Yarn workspaces, TS `strict`, project refs
* [ ] Set up ESLint, Prettier, Changesets, commitlint
* [ ] Configure CI (typecheck, lint, unit, conformance, examples)
* [ ] Repo layout
  * [x] `packages/runtime`
  * [x] `packages/engine-builtin`
  * [ ] `packages/react` (renderer)
  * [ ] `packages/engine-langgraph`
  * [ ] `examples/*`
  * [ ] `docs/`
* [ ] ESM builds with `"exports"` maps; tree-shake optional engines

## 1) Core Design Contracts (runtime)

* [x] Define `Delta` (readable) + `WireDelta` (compact) and codecs
* [x] Define `Engine`, `RunHandle`, `RunInput`
* [x] Define `Transport`, `ToolRuntime`, `VectorIndex`
* [x] Errors (`LlmError`, `normalizeError`) and budget utils
* [x] **Tests:** encode/decode round-trip, budget math, error normalization

## 2) React Renderer (Mutation Mode)

* [ ] HostConfig (create/append/insert/prepare/commit/remove)
* [ ] Components: `<LLMProvider> <Chat> <System> <User> <Assistant> <Stream> <Tool>`
* [ ] Hooks: `useChat`, `useCompletion`, `useTool`, `useIndex`, `useCost`
* [ ] Abort on unmount; coalesce side effects

## 3) Built-in Engine (LiteLLM + tools)

* [x] Stream assistant tokens from LiteLLM; cancellation/abort
* [x] Capture OpenAI-style `tool_calls`, execute registered tools
* [x] Second pass with tool results; emit final `status: done`
* [ ] JSON-schema/structured output with auto-retry (optional)
* [ ] Dedupe by content hash within a commit
* [ ] SSR/Suspense/Transitions hardening
* [ ] **Tests:** env-guarded LiteLLM integration (optional)

## 4) RAG System & Adapters

* [ ] Chunker + packing by token budget
* [ ] `<Index>` incremental updates; `<Retriever>` injection
* [ ] Vector adapters (pgvector, qdrant, pinecone)

## 5) LangGraph Engine (optional)

* [ ] Map `<Agent><Planner><Executor><Critic><HumanGate>` to graph
* [ ] Checkpointers (in-memory/dev, Postgres/prod)
* [ ] `resume(id)` support and parity with builtin deltas

## 6) Temporal Integration (optional)

* [ ] `temporal-bridge` (start/query/cancel) + minimal React helpers
* [ ] Example: background agent run with status in UI

## 7) Tracing & Devtools (deferred)

* [ ] OTel spans + optional exporters
* [ ] DevTools panel (prompts, deltas, tokens, costs)

## 8) Safety, Governance, Budgets

* [ ] `<Guardrails schema|moderation>`
* [ ] Budget policy per subtree; engine enforcement hooks
* [ ] Tool allowlists / MCP server scoping; redaction in traces

## 9) DX Polish & Examples

* [ ] `examples/nextjs-chat` (SSR/Edge, tools, budgets)
* [ ] `examples/rag-handbook`
* [ ] `examples/agents-triage` (LangGraph)
* [ ] `examples/cost-dashboard`
* [ ] ESLint rules + (optional) CLI scaffolder
* [ ] Docs site

## 10) Testing Strategy

* [x] **Runtime unit tests:** delta codecs, budget tracker, error normalization
* [ ] Engine conformance (builtin ↔ langgraph) via golden traces
* [ ] Integration: examples with mocked transport
* [ ] Contract tests: MCP round-trip; vector adapters with deterministic embeddings
* [ ] E2E (Playwright): streaming, cancellation, Suspense fallbacks

## 11) Release Strategy

* [ ] Alpha: runtime + engine-builtin + minimal renderer
* [ ] Beta: LangGraph engine + vector adapters
* [ ] 1.0: Temporal bridge + devtools + docs

---

## Immediate Next Steps

* [ ] Implement `@react-llm-fiber/react` skeleton (HostConfig + `<LLMProvider>/<Chat>/<Stream>`).
* [ ] Add minimal `VectorIndex` usage path (either inside engine or as a tiny `vector-memory` package).
* [ ] Create `examples/nextjs-chat` to exercise runtime + engine-builtin.
* [ ] Set up CI and basic linting/prettier.
