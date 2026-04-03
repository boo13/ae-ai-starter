# Your First Automation

This guide walks you through using an AI assistant to automate something in your After Effects project. By the end, you'll understand the core loop: describe what you want, let the AI write the script, run it in AE.

## Before You Start

Make sure you've completed setup:

1. You ran `Scripts/setup.jsx` in After Effects (see [Quick Start](../README.md#quick-start))
2. An analysis report exists at `Scripts/reports/analysis.md`

If you haven't done these steps yet, go back to the README and follow the Quick Start.

## Setting Up Your AI Assistant

### Claude Code (recommended)

Claude Code reads your project files automatically. Open a terminal in your project directory and start Claude Code — it will read the repo's AI instructions (`CLAUDE.md`, which in this template symlinks to `AGENTS.md`) and already know about your project structure, ES3 constraints, and available libraries.

To give it full context about your AE project, ask:

> "Read Scripts/reports/analysis.md to understand my After Effects project."

That's it. Claude Code now knows your compositions, layers, and properties.

### Other AI Assistants (ChatGPT, Gemini, Cursor, etc.)

If your AI assistant doesn't read project files automatically, you'll need to share two files:

1. **Copy the contents of `AGENTS.md`** into your conversation. This tells the AI about the project structure, ES3 constraints, and available libraries.
2. **Copy the contents of `Scripts/reports/analysis.md`** into your conversation. This tells the AI about your specific AE project — compositions, layers, properties, and expressions.

With both files shared, the AI has the same context as Claude Code.

## Example Prompts

These examples work with any AE project. Replace the placeholders with real names from your analysis report.

### Example 1: Understand Your Project

Start by confirming the AI has context. Ask:

> "What compositions are in my project and what layers do they contain?"

The AI should summarize your project structure from the analysis report. No script needed — this just validates it has the right context. If it can't answer, re-share the analysis report.

### Example 2: Change Text on a Layer

Ask the AI to write a simple script:

> "Write a script that changes the text on the layer called [YOUR LAYER NAME] in [YOUR COMP NAME] to say 'Hello World'."

Replace `[YOUR LAYER NAME]` and `[YOUR COMP NAME]` with actual names from your project. The AI should produce something like this:

```javascript
#include "lib/helpers.jsxinc"

app.beginUndoGroup("Update text");

var comp = app.project.activeItem;
var layer = comp.layer("YOUR LAYER NAME");
var textProp = layer.property("Source Text");
setTextPropertyValue(textProp, "Hello World");

app.endUndoGroup();
```

To run it: save the script as a `.jsx` file in your `Scripts/` folder, then in After Effects go to **File > Scripts > Run Script File** and select it.

### Example 3: Read Data from a File

Try something more useful — loading data from a JSON file:

> "Write a script that reads a JSON file from Input/data.json and sets the text of [LAYER 1] to the 'headline' field and [LAYER 2] to the 'subtitle' field."

The AI should produce a script using `readJsonFile` from the io library:

```javascript
#include "lib/helpers.jsxinc"
#include "lib/io.jsxinc"

app.beginUndoGroup("Load data");

var comp = app.project.activeItem;
var scriptFile = new File($.fileName);
// Navigate from Scripts/ up to project root, then into Input/
var dataFile = new File(scriptFile.parent.parent.fsName + "/Input/data.json");
var data = readJsonFile(dataFile);

var layer1 = comp.layer("LAYER 1");
setTextPropertyValue(layer1.property("Source Text"), data.headline);

var layer2 = comp.layer("LAYER 2");
setTextPropertyValue(layer2.property("Source Text"), data.subtitle);

app.endUndoGroup();
```

Notice it uses `#include "lib/io.jsxinc"` in addition to helpers — each library is a separate file.

## When Things Go Wrong

Scripts won't always work on the first try. Here's how to handle common issues:

**ExtendScript error dialog pops up.** Read the error message and line number, then tell the AI exactly what it says. For example: "I got 'layer is null' on line 8." The AI can usually fix it immediately.

**Nothing seems to happen.** The script may have run without errors but targeted the wrong layer or property. Check the layer names in your analysis report match what the script uses.

**"X is not a function" error.** The script is calling a function from a library it didn't include. Make sure the right `#include` lines are at the top. `readJsonFile` needs `io.jsxinc`, not just `helpers.jsxinc`.

**Layer names changed since analysis.** If you've modified your AE template (added, removed, or renamed layers), re-run the analysis: `File > Scripts > Run Script File > Scripts/analyze/run_analysis.jsx`. Then share the updated report with your AI.

**The AI writes modern JavaScript (const, let, arrow functions).** Remind it: "This needs to be ES3/ExtendScript compatible. Use var, function keywords, and string concatenation only." The AGENTS.md file should prevent this, but it can happen with paste-based assistants that don't have the full context.

## Where to Save Scripts

Save AI-generated scripts in your `Scripts/` folder at the project root. This is where `#include` paths resolve from, so library includes will work correctly.

Name them descriptively: `update_headlines.jsx`, `swap_photos.jsx`, `set_timing.jsx`.

## Next Steps

You've got the basics. Here's where to go from here:

- **[Recipes](recipes.md)** — Pre-built patterns for common tasks like populating repeated layers, swapping images, and calculating timing. Much faster than writing from scratch.
- **[AI Workflow Guide](ai-workflow.md)** — Advanced tips on keeping reports current, using the test harness, and organizing scripts.
- **[Examples](../examples/)** — Standalone projects showing how all the pieces fit together.
