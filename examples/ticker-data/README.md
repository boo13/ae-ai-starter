# AI Claude for After Effects

A CEP panel that provides a chat interface for communicating with Claude directly inside After Effects via the Anthropic API. Send instructions, get scripts generated, run common actions, and attach comp screenshots without leaving AE.

## Architecture

- **CEP Panel** (Chromium + Node.js) docked inside After Effects
- **Svelte** for the chat UI with markdown rendering
- **`@anthropic-ai/sdk`** for direct HTTP streaming to the Anthropic API
- **ExtendScript bridge** for querying AE project state

## Prerequisites

- After Effects 2023 or later
- Node.js 18–24 (Node 25+ is not recommended due to CEP compatibility)
- An [Anthropic API key](https://console.anthropic.com/settings/keys)
- CEP debug mode enabled (use [ZXP Installer](https://aescripts.com/learn/zxp-installer/) > Settings > Enable Debugging)

## Setup

```bash
cd examples/ai-claude
npm install
npm run build
```

Restart After Effects, then open the panel: **Window > Extensions > AI Claude**

## API Key Configuration

The panel looks for your API key in two places, in order:

1. **Environment variable** — set `ANTHROPIC_API_KEY` in your shell before launching After Effects
2. **Settings UI** — if no key is found on launch, the panel shows an input field where you can paste your key; it is saved to `localStorage`

## Development

```bash
npm run dev
```

Restart AE to load the extension. Changes to Svelte components hot-reload automatically.

## Usage

- **Type a message** to ask Claude about your AE project. Active comp, layer list, and project path are automatically included as context.
- **Model selector** in the header switches between Haiku, Sonnet, and Opus.
- **Run Analysis** executes the project analysis script directly in AE and updates the context.
- **Describe Comp** asks Claude to analyze the active composition.
- **Fix Last Error** sends the most recent AE error back to Claude for diagnosis.
- **AI Action** reruns the current temporary script for this session after Claude has prepared one.
- **Shot** captures the current comp frame as a screenshot and attaches it to your next message.

## How It Works

1. Svelte UI captures user input
2. Context builder queries AE state via the ExtendScript bridge (`evalTS`)
3. The message is sent to the Anthropic API using `@anthropic-ai/sdk` with SSE streaming
4. Streamed tokens are rendered into the chat area as they arrive
5. If the response contains an `<ai-action>` block, the panel writes it to `.session/ai-action.jsx` and offers to run it immediately
6. Response is rendered as sanitized markdown

## Production Build

```bash
npm run zxp
```

This packages the extension as a `.zxp` file for distribution.
