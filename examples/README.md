# Examples

Each subfolder is a complete, standalone project that demonstrates what you can build with ae-ai-starter's recipes and scripting patterns.

**These are optional.** Delete any example folder you don't need — nothing in `Scripts/` depends on them.

## What's Here

| Example | Type | What it shows |
|---------|------|---------------|
| [social-card](social-card/) | ExtendScript | Combines all three recipes (repeating-elements, image-swap, data-timing) to automate a multi-card social media template |
| [audio-spectrum](audio-spectrum/) | ExtendScript | Procedurally generated audio spectrum visualizer with log-frequency mapping, multiple display modes, and per-bar shape layers |
| [ticker-data](ticker-data/) | CEP Panel | Fetches stock data via yahoo-finance2 and builds stock cards, sparklines, and comparison charts in After Effects; successor to the older `stock_ticker` demo |

## Installing an Example

**ExtendScript examples** (`social-card`, `audio-spectrum`) have no build step. Open After Effects and run the example's `setup.jsx` via File → Scripts → Run Script File, or follow the example's README.

**CEP panel examples** (`ticker-data`) require a build and symlink step:

```bash
cd examples/<name>
npm install
npm run build
npm run symlink    # Links panel into AE's CEP extensions folder
```

Then restart After Effects and open from **Window → Extensions → \<Panel Name\>**.

> CEP panels also require unsigned extensions to be enabled once per machine — see the example's README for the `defaults write` command.

Ask Claude to "install example \<name\>" for guided setup.
