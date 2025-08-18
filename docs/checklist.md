# react-llm-fiber — Development Checklist

## 0) Monorepo & Scaffolding

* [ ] Initialize Nx + Yarn workspaces, TS `strict`, project refs
* [ ] Set up ESLint, Prettier, Changesets, commitlint
* [ ] Configure CI (typecheck, lint, unit, conformance, examples)
* [ ] Repo layout

  * [ ] `packages/core`
  * [ ] `packages/reconciler`
  * [ ] `packages/engine-builtin`
  * [ ] `packages/engine-langgraph`
  * [ ] `packages/transport-litelm`
  * [ ] `packages/tools-mcp`
  * [ ] `packages/vector-memory`
  * [ ] `packages/vector-adapters` (pgvector, qdrant, pinecone)
  * [ ] `packages/devtools`
  * [ ] `packages/tracing`
  * [ ] `examples/*`
  * [ ] `docs/`
* [ ] ESM builds with `"exports"` maps; sideEffects flags; tree-shake optional engines
* [ ] **Acceptance:** repo builds green locally + CI ✅

## 1) Core Design Contracts

* [ ] Define `Delta` event protocol (token, tool\_call, tool\_result, meta, status, error)
* [ ] Define `Engine` interface (`run`, optional `agent`, optional `resume`)
* [ ] Define `Transport` adapter (LiteLLM-first) + embeddings (optional)
* [ ] Define `ToolRuntime` (register/call) with Zod validation
* [ ] Define `VectorIndex` (upsert/search)
* [ ] Normalize error model (`LlmError` kinds) and budget types
* [ ] **Acceptance:** compiled types + unit tests for contracts ✅

## 2) Reconciler (Mutation Mode) & JSX Surface

* [ ] Implement HostConfig (create/append/insert/prepareUpdate/commitUpdate/remove/commitMount)
* [ ] Components: `<LLMProvider> <Chat> <System> <User> <Assistant> <Stream>`
* [ ] Components: `<Tool>` (MCP-backed), `<Index>` `<Retriever>`
* [ ] Hooks: `useLLM`, `useChat`, `useCompletion`, `useTool`, `useIndex`, `useCost`, `useTrace`, `useMemory`
* [ ] Abort on unmount; coalesce side effects in `prepareForCommit/resetAfterCommit`
* [ ] **Acceptance:** editing `<System>` restarts only affected run; removing `<Stream>` aborts tokens ✅

## 3) Built-in Engine (Default)

* [ ] Implement `engine-builtin` using `transport-litelm` + `tools-mcp` + `vector-memory`
* [ ] Streaming with backpressure + cancellation
* [ ] Optional JSON-schema response validation + auto-retry
* [ ] Content hashing for call dedupe within a commit
* [ ] Suspense/Transitions + SSR support
* [ ] **Acceptance:** `examples/nextjs-chat` streams; tools work; budgets enforce ✅

## 4) RAG System & Adapters

* [ ] Chunker (size/overlap), dedupe, packing by token budget
* [ ] `<Index name source …>` incremental updates
* [ ] `<Retriever index k>` injection; `showContext` rendering
* [ ] Implement `vector-adapters/pgvector` + `qdrant`; stub pinecone
* [ ] **Acceptance:** changing `docs` re-upserts deltas; retrieved context annotated in stream ✅

## 5) LangGraph Engine (Optional)

* [ ] Map `<Agent><Planner><Executor><Critic><HumanGate>` → LangGraph `StateGraph`
* [ ] Checkpointers: in-memory (dev) + Postgres (prod)
* [ ] Bind MCP tools inside graph
* [ ] Implement `resume(id)` reattachment
* [ ] Conformance to `Delta` semantics (plan/execute/status/tool events)
* [ ] **Acceptance:** `examples/agents-triage` runs with pause/resume; survives server restart with Postgres ✅

## 6) Temporal Integration (Optional Package)

* [ ] `@react-llm-fiber/temporal-bridge` (start/query/cancel)
* [ ] UI: `<StartInBackground/>` + `<RunStatus runId/>`
* [ ] Workflows can use builtin or LangGraph engine internally
* [ ] **Acceptance:** `examples/temporal-bg` completes across deploys; cancel works; output visible in UI ✅

## 7) Tracing & Devtools

* [ ] OTel spans for model calls, tools, indexing, retrieval
* [ ] Exporters: console (dev), Langfuse/LangSmith (opt-in)
* [ ] React DevTools panel: prompt graph, deltas, tokens, costs, latency
* [ ] Test helper: `renderToLLMTrace()` (seeded snapshots)
* [ ] **Acceptance:** spans visible end-to-end; snapshot replay deterministic ✅

## 8) Safety, Governance, Budgets

* [ ] `<Guardrails schema|moderation>` (schema parsing + retry; moderation gates)
* [ ] Budget policy per subtree (USD/tokens) with pre-call enforcement
* [ ] Tool allowlists; MCP server scoping per `<LLMProvider>`
* [ ] Redaction in traces (PII scrub); full text kept in-memory only (configurable)
* [ ] **Acceptance:** blocked outputs prevented; over-budget throws/suspends with clear error UI ✅

## 9) DX Polish & Examples

* [ ] `examples/nextjs-chat` (SSR/Edge, tools, budgets)
* [ ] `examples/rag-handbook` (index + retriever + annotations)
* [ ] `examples/agents-triage` (LangGraph + HumanGate)
* [ ] `examples/temporal-bg` (background run)
* [ ] `examples/cost-dashboard` (aggregate `useCost()`)
* [ ] ESLint rules: unkeyed streams, unsafe interpolation in `<System>`, missing `<Tool>` schema
* [ ] (Optional) CLI to scaffold MCP tools & vector adapters
* [ ] Docs: concepts, engines, transport/tools, RAG, observability/testing, recipes
* [ ] **Acceptance:** examples runnable locally + in CI; docs publishable ✅

## 10) Testing Strategy

* [ ] Unit: deltas, parsers, prop diffing, budget math
* [ ] Engine conformance: golden traces (builtin vs LangGraph)
* [ ] Integration: examples headless with mocked transport; real LiteLLM-tagged CI job
* [ ] Contract tests: MCP round-trip + Zod; vector adapters with deterministic embeddings mock
* [ ] E2E (Playwright): streaming, cancellation, Suspense fallbacks
* [ ] **Acceptance:** CI green across unit/integration/E2E; conformance parity report ✅

## 11) Release Strategy & Stability

* [ ] Alpha: core + builtin engine + LiteLLM + MCP + memory vector + basic devtools
* [ ] Beta: LangGraph engine + pgvector/qdrant + tracing exporters
* [ ] 1.0: Temporal bridge + polished devtools + hardened docs
* [ ] Semver policy: stable JSX/hooks; engines/adapters version independently
* [ ] Feature flags via `<LLMProvider experimental={{…}}>`
* [ ] **Acceptance:** tagged releases; changelogs via Changesets; upgrade guide ✅

## 12) Risks & Mitigations

* [ ] Engine divergence → conformance suite + shared Delta protocol
* [ ] Streaming edge cases → backpressure tests + explicit abort on unmount
* [ ] Provider quirks via LiteLLM → normalized errors + token counts; warnings on unknowns
* [ ] Index latency/size → async build paths, background upserts, progress surfaced
* [ ] Tool security → default deny, allowlists, sandbox MCP, redact logs

---

## Immediate Next Steps (Tranche 1)

* [ ] Scaffold monorepo + packages + CI
* [ ] Implement `transport-litelm` (happy path + mock)
* [ ] Implement `tools-mcp` (register/call + Zod)
* [ ] Build reconciler core + `<LLMProvider> <Chat> <Stream> <Tool>` + `useChat/useCompletion`
* [ ] Ship `engine-builtin` MVP + `examples/nextjs-chat`
* [ ] Add `vector-memory` + `<Index>/<Retriever>` + `examples/rag-handbook`
* [ ] Stand up basic devtools + OTel tracing
* [ ] Start engine conformance tests; scaffold `engine-langgraph` behind flag
