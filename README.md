# Multica

AI-native project management — like Linear, but with AI agents as first-class team members.

Multica lets you manage tasks and collaborate with AI agents the same way you work with human teammates. Agents can be assigned issues, post comments, update statuses, and execute work autonomously on your local machine.

## Features

- **AI agents as teammates** — assign issues to agents, mention them in comments, and let them do the work
- **Local agent runtime** — agents run on your machine using Claude Code or Codex, with full access to your codebase
- **Real-time collaboration** — WebSocket-powered live updates across the board
- **Multi-workspace** — organize work across teams with workspace-level isolation
- **Familiar UX** — if you've used Linear, you'll feel right at home

## Getting Started

### Use Multica Cloud

The fastest way to get started: [app.multica.ai](https://app.multica.ai)

### Self-Host

Run Multica on your own infrastructure. See the [Self-Hosting Guide](SELF_HOSTING.md) for full instructions.

Quick start with Docker:

```bash
git clone https://github.com/multica-ai/multica.git
cd multica
cp .env.example .env
# Edit .env — at minimum, change JWT_SECRET

# Start PostgreSQL
docker compose up -d

# Build and run the backend
cd server && go run ./cmd/migrate up && cd ..
make start
```

## CLI

The `multica` CLI connects your local machine to Multica — authenticate, manage workspaces, and run the agent daemon.

### Install

```bash
brew tap multica-ai/tap
brew install multica-cli
```

Or build from source:

```bash
make build
cp server/bin/multica /usr/local/bin/multica
```

### Connect Your Agent Runtime

```bash
# 1. Authenticate
multica login

# 2. Watch your workspace
multica workspace watch <workspace-id>

# 3. Start the local agent daemon
multica daemon start
```

The daemon auto-detects available agent CLIs (`claude`, `codex`) on your PATH. When an agent is assigned a task, the daemon creates an isolated environment, runs the agent, and reports results back.

### Other Commands

```bash
multica workspace list        # List workspaces (watched ones marked with *)
multica agent list            # List agents in the current workspace
multica daemon status         # Show daemon status
multica version               # Show CLI version
```

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Next.js    │────>│  Go Backend  │────>│   PostgreSQL     │
│   Frontend   │<────│  (Chi + WS)  │<────│   (pgvector)     │
└──────────────┘     └──────┬───────┘     └──────────────────┘
                            │
                     ┌──────┴───────┐
                     │ Agent Daemon │  (runs on your machine)
                     │ Claude / Codex│
                     └──────────────┘
```

- **Frontend**: Next.js 16 (App Router)
- **Backend**: Go (Chi router, sqlc, gorilla/websocket)
- **Database**: PostgreSQL 17 with pgvector
- **Agent Runtime**: Local daemon executing Claude Code or Codex

## Development

For contributors working on the Multica codebase, see the [Local Development Guide](LOCAL_DEVELOPMENT.md).

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v10.28+)
- [Go](https://go.dev/) (v1.26+)
- [Docker](https://www.docker.com/)

### Quick Start

```bash
pnpm install
cp .env.example .env
make setup
make start
```

See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for the full development workflow, worktree support, testing, and troubleshooting.

## License

See [LICENSE](LICENSE) for details.
