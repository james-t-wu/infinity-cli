# infinity CLI

> AI-friendly CLI for editing the infinity-web project.

## What is this?

This is the **CLI tool** for editing the `infinity-web` website project.
It's separate from the website itself — install it once, use it on the website.

## Install

### For developers (linking from source)

```bash
git clone <this-repo>
cd infinity-cli
npm install
npm link
```

### For end users (after publishing to npm)

```bash
npm install -g infinity
```

## Quick Start

```bash
# Go to the website project (which contains AGENTS.md)
cd /path/to/infinity-web

# Check status
infinity status

# Make changes
infinity title set "New Title"
infinity content set "h1.hero-title" "Welcome"
infinity theme set dark

# Backup before risky changes
infinity backup --message "before redesign"

# Restore if needed
infinity history
infinity restore <backup-id>
```

## Use with AI Agents

This CLI is designed to work with AI Agents (Claude Code, Cursor, etc.).

The infinity-web project includes an `AGENTS.md` file that teaches AI agents:
- What commands are available
- Common modification patterns
- Best practices (backup before changes, use --json, etc.)

Workflow:
```
1. Open the infinity-web project in your AI Agent
2. Tell the Agent what to change (in natural language)
3. The Agent reads AGENTS.md, calls infinity commands
4. Review git diff, commit, push
```

## All Commands

| Command | Description |
|---------|-------------|
| `status` | Show project info (run this first) |
| `title get/set` | Manage page title |
| `theme list/get/set` | Apply built-in themes |
| `page list/new` | Manage pages |
| `content get/set` | Edit text by CSS selector |
| `style get/set` | Modify CSS rules |
| `backup` | Snapshot current state |
| `restore <id>` | Restore from snapshot |
| `history` | List backups |
| `preview` | Local preview instructions |

Run `infinity <command> --help` for details.

## Project Layout

```
infinity-cli/                  # This repo
├── bin/infinity.js            # CLI entry
├── src/commands.js            # Command implementations
├── package.json
└── README.md

# vs.

infinity-web/                  # The website project (separate repo)
├── index.html
├── about.html
├── AGENTS.md                  # Tells AI agents about this CLI
└── .infinity-backups/         # CLI working directory (gitignored)
```

## License

MIT
