# Panel

This directory holds your project's ScriptUI panel.

## Setup

Run `Scripts/setup.jsx` with the "Create UI Panel" option enabled. It generates a dockable automation panel here.

The panel is meant to show what AE automation can do without requiring project analysis first. It includes actions for:

- **Create Comp** -- seeds a new composition from width / height / duration / FPS inputs
- **Build Demo Scene** -- creates a comp, backdrop, guides, title stack, camera rig, and markers
- **Guide Presets** -- adds thirds, safe-area, and center guides to the active comp
- **Layer Tools** -- creates a backdrop, animated title stack, and a simple camera orbit rig
- **Queue Active Comp** -- sends the active comp to the render queue

You can also use the ready-to-run panel at `Scripts/panel/automation_lab_panel.jsx` directly.

## Installation

The setup script can create a symlink from AE's ScriptUI Panels folder to this file. This lets you develop the panel in your code editor while AE reads it via symlink.

**Manual symlink (macOS):**
```bash
ln -s "/path/to/your/repo/Scripts/panel/my_project_panel.jsx" "/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/my_project_panel.jsx"
```

**Manual symlink (Windows):**
```cmd
mklink "C:\Program Files\Adobe\After Effects <version>\Scripts\ScriptUI Panels\my_project_panel.jsx" "C:\path\to\repo\Scripts\panel\my_project_panel.jsx"
```

`setup.jsx` generates the panel filename from your project name, so replace `my_project_panel.jsx` with the actual file it created. If you want a fixed, ready-to-run example instead of a generated panel, symlink `automation_lab_panel.jsx`.

## Development

Edit `panel_template.jsxinc` to change the generated panel, or edit `automation_lab_panel.jsx` if you want a direct entry point. To reload in AE:
- Close and reopen the panel (Window menu)
- Or restart After Effects

The panel `#include`s shared libraries from `Scripts/lib/`, so changes to helpers or I/O utilities are picked up on reload.
