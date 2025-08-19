@react-llm-fiber/engine-langgraph: Optional engine that runs agent graphs with checkpoints, interrupts, and replay (LangGraph-backed).

@react-llm-fiber/transport-litelm: Thin transport to a LiteLLM proxy (SSE → wire deltas), for teams that want it separate from the engine.

@react-llm-fiber/tools-mcp: MCP client/runtime for discovering, registering, and invoking standardized tools.

@react-llm-fiber/vector-memory: Simple in-memory VectorIndex for dev/testing.

@react-llm-fiber/adapter-pgvector: VectorIndex backed by Postgres/pgvector.

@react-llm-fiber/adapter-qdrant: VectorIndex backed by Qdrant.

@react-llm-fiber/adapter-pinecone: VectorIndex backed by Pinecone.

@react-llm-fiber/devtools: React DevTools panel + trace viewer: prompts, deltas, tokens, costs, timings.

@react-llm-fiber/tracing: OpenTelemetry helpers and optional exporters (e.g., Langfuse/LangSmith).

@react-llm-fiber/temporal-bridge: Start/query/cancel durable background runs via Temporal; small React helpers to display status.

@react-llm-fiber/eslint-plugin: Rules for unsafe prompt interpolation, unkeyed streams, missing tool schemas.

@react-llm-fiber/cli: Scaffolder for example apps, MCP tool stubs, and vector adapter templates.
