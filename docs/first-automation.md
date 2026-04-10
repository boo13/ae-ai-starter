# Your First Automation

This guide walks you through the core loop: describe what you want, let the AI write the script, run it in AE.

## Before You Start

Make sure you've completed setup:

1. You ran `Scripts/setup.jsx` in After Effects (see [Quick Start](../README.md#quick-start))
2. An analysis report exists at `Scripts/reports/analysis.md`

If you haven't done these steps yet, go back to the README and follow the Quick Start.

## How It Works

The loop is simple:

1. **Describe what you want** — in plain language, using layer and comp names from your project
2. **AI writes the script** — it reads your analysis report and generates working ExtendScript code
3. **Run it in AE** — via **File > Scripts > Run Script File**, or a button on your custom panel
4. **Check the result** — if something's off, tell the AI what happened and it will fix it

That's it. Repeat as needed.

## Giving the AI Context

If you're using **Claude Code**, it reads your project files automatically. Just ask:

> "Read Scripts/reports/analysis.md to understand my After Effects project."

If you're using **another AI** (ChatGPT, Cursor, Gemini, etc.), paste the contents of both `AGENTS.md` and `Scripts/reports/analysis.md` into your conversation before asking for scripts.

## Try It

Once the AI has context, try a simple request:

> "Write a script that changes the text on the layer called [YOUR LAYER NAME] in [YOUR COMP NAME] to say 'Hello World'."

Replace the placeholders with actual names from your project. The AI will write a `.jsx` file — save it to your `Scripts/` folder and run it in AE via **File > Scripts > Run Script File**.

If setup created a panel for you, the AI can also add a button to it — just ask.

## When Things Go Wrong

**Error dialog pops up.** Copy the exact error text and line number and paste it to the AI. It can usually fix it immediately.

**Nothing happened.** The script may have targeted the wrong layer. Double-check that the names in the script match your analysis report exactly.

**Layer names changed.** If you've modified your AE template, re-run `Scripts/analyze/run_analysis.jsx` to refresh the report, then ask the AI again.

**AI uses modern JavaScript.** Remind it: "This needs to be ES3/ExtendScript compatible — use `var`, no arrow functions, no template literals."

## Next Steps

- **[Recipes](recipes.md)** — Pre-built patterns for common tasks like populating repeated layers, swapping images, and calculating timing
- **[AI Workflow Guide](ai-workflow.md)** — Advanced tips on keeping reports current and organizing scripts
- **[Examples](../examples/)** — Standalone projects showing how all the pieces fit together
