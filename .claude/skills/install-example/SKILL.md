---
name: install-example
description: Install any example from the examples/ directory into After Effects. Handles CEP panel examples (npm install, build, symlink) and pure ExtendScript examples (no build step). Triggers on "install example", "setup example", "install ticker-data", "install audio-spectrum", "install social-card".
---

# Install Example

## Step 1: Identify the example

If the user didn't name one, list the available examples:

```bash
ls examples/
```

Ask which example they want to install.

## Step 2: Detect the example type

Check whether the example has a `package.json`:

```bash
ls examples/<name>/package.json
```

- **File exists** → CEP Panel (go to Step 3A)
- **File not found** → ExtendScript only (go to Step 3B)

---

## Step 3A: CEP Panel Install (e.g. ticker-data)

### Enable unsigned extensions (required once per machine)

Adobe blocks unsigned CEP extensions by default. Without this, the panel opens as a blank white window.

Ask the user to run in Terminal, then restart After Effects:

```bash
# AE 2022–2023 (CEP 11)
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
# AE 2024+ (CEP 12)
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

They only need to do this once per machine.

### Install, build, and symlink

```bash
cd examples/<name>
npm install
npm run build
npm run symlink
```

Order matters: build before symlink.

### Finish

Tell the user to restart After Effects, then open the panel from **Window → Extensions → \<Panel Name\>**.

**Verify:** Check that `examples/<name>/dist/` exists and contains `main/index.html`.

---

## Step 3B: ExtendScript Install (e.g. audio-spectrum, social-card)

No build step needed. Tell the user:

1. Open After Effects.
2. Open the example's `README.md` to check prerequisites (e.g. an existing comp, an audio layer).
3. If the example has a `setup.jsx`: run it via **File → Scripts → Run Script File**.
4. If the example is recipe-based (like social-card): follow the usage instructions in its README.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `npm install` fails | Check Node.js 18+ is installed: `node --version` |
| Panel opens blank/white | Unsigned extensions not enabled — run the `defaults write` commands above |
| Panel not in Window menu | Symlink failed or AE not restarted — re-run `npm run symlink`, then restart AE |
| `setup.jsx` errors | Read the error message in the dialog; check example README for prerequisites |
