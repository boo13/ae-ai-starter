# AI Chat for After Effects

A CEP panel that provides a chat interface for communicating with Claude directly inside After Effects. Send instructions, get scripts generated, run common actions -- without leaving the AE app.

## Architecture

- **CEP Panel** (Chromium + Node.js) docked inside After Effects
- **Svelte** for the chat UI with markdown rendering
- **Claude CLI** (`claude --print`) for the AI backend via Node.js `child_process`
- **ExtendScript bridge** for querying AE project state

## Prerequisites

- After Effects 2023 or later
- Node.js 18+
- [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- CEP debug mode enabled (use [ZXP Installer](https://aescripts.com/learn/zxp-installer/) > Settings > Enable Debugging)

## Setup

```bash
cd examples/ai-chat
npm install
npm run build    # builds and symlinks the extension
```

Restart After Effects, then open the panel: **Window > Extensions > AI Chat**

## Development

```bash
npm run dev      # starts Vite dev server with HMR
```

After starting dev mode, restart AE to load the extension. Changes to Svelte components hot-reload automatically.

## Usage

- **Type a message** to ask Claude about your AE project. Context (active comp, layers, project path) is automatically included.
- **Model selector** in the header switches between Sonnet (faster) and Opus (more capable).
- **Run Analysis** button executes the project analysis script directly in AE.
- **Describe Comp** asks Claude to analyze the active composition.
- **Fix Last Error** sends the most recent error to Claude for diagnosis.

## Building for Production

```bash
npm run build    # static build, works without dev server
npm run zxp      # package as signed ZXP for distribution
```

## How It Works

1. Svelte UI captures user input
2. Context builder queries AE state via ExtendScript bridge (`evalTS`)
3. Claude CLI is spawned as a child process with project context appended
4. Response is rendered as markdown in the chat area
5. CLAUDE.md in the project root is automatically picked up by Claude CLI
