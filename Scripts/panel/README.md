# Panel

This directory holds your project's ScriptUI panel.

## Setup

Run `Scripts/setup.jsx` with the "Create UI Panel" option enabled. It generates `project_panel.jsx` here with:

- **Refresh Analysis** button (re-runs the analysis system)
- **Select Data File** button (JSON picker)
- **Debug section** (collapsible, shows data file summary)

## Installation

The setup script can create a symlink from AE's ScriptUI Panels folder to this file. This lets you develop the panel in your code editor while AE reads it via symlink.

**Manual symlink (macOS):**
```bash
ln -s "/path/to/your/repo/Scripts/panel/project_panel.jsx" "/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/project_panel.jsx"
```

**Manual symlink (Windows):**
```cmd
mklink "C:\Program Files\Adobe\After Effects <version>\Scripts\ScriptUI Panels\project_panel.jsx" "C:\path\to\repo\Scripts\panel\project_panel.jsx"
```

## Development

Edit `project_panel.jsx` in your code editor. To reload in AE:
- Close and reopen the panel (Window menu)
- Or restart After Effects

The panel `#include`s shared libraries from `Scripts/lib/`, so changes to helpers or I/O utilities are picked up on reload.
