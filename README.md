# Super Multica

A multi-component architecture for distributed agent systems.

## Project Structure

```
src/
├── agent/      # Agent module
├── gateway/    # Gateway module
├── client/     # Client module
└── shared/     # Shared types and utilities
```

## Getting Started

```bash
pnpm install
pnpm dev
```

## Agent CLI

Use the agent module directly from the CLI for isolated testing.

```bash
pnpm agent:cli "hello"

# Persist a session under ~/.super-multica/sessions/<id>/session.jsonl
pnpm agent:cli --session demo "remember my name is Alice"
pnpm agent:cli --session demo "what's my name?"

# Override provider/model
pnpm agent:cli --provider openai --model gpt-4o-mini "hi"
```

## Scripts

- `pnpm dev` - Run in development mode
- `pnpm agent:cli` - Run the agent CLI for module-level testing
- `pnpm build` - Build for production
- `pnpm start` - Run production build
- `pnpm typecheck` - Type check without emitting
