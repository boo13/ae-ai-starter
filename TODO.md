# Pre-Publication TODO

Tasks to complete before making this repository public.

---

## High Priority

- [x] **Add CONTRIBUTING.md** — Explain how to report bugs, suggest features, and submit pull requests. Clarifies expectations for open-source contributors.

- [x] **Add CODE_OF_CONDUCT.md** — Standard for public open-source projects. The [Contributor Covenant](https://www.contributor-covenant.org/) template is a common choice.

- [ ] **Decide what to do with `docs/plans/` and `docs/solutions/`** — These are internal planning and integration notes. They aren't harmful to publish, but they may confuse end users who aren't contributors. Options: remove them, move them to a wiki, or keep them as-is for transparency.

- [x] **Configure the GitHub repo as a template** — On GitHub: Settings → check "Template repository". This enables the **Use this template** button referenced in the README.

- [ ] **Add a GitHub repository description and topics** — On the repo's main page, add a short description and relevant topics (e.g., `after-effects`, `extendscript`, `automation`, `ai`, `motion-design`). This improves discoverability.

---

## Medium Priority

- [ ] **Add GitHub issue templates** — Create `.github/ISSUE_TEMPLATE/` with templates for bug reports and feature requests. Prevents low-quality issues and helps contributors provide the right information.

- [ ] **Review the `example/` directory** — Confirm the example scripts and data work correctly end-to-end without requiring an actual `.aep` file. Add a note in `example/README.md` if the example can't be run without one.

- [ ] **Add a social preview image** — GitHub shows a preview image when the repo is shared on social media. Create a simple `og-image.png` and set it under Settings → Social preview.

---

## Low Priority / Nice to Have

- [ ] **Add a CHANGELOG** — A `CHANGELOG.md` or GitHub Releases entry helps users understand what changed between versions. Even an initial `v1.0.0` entry is useful.

- [ ] **Add `.github/PULL_REQUEST_TEMPLATE.md`** — A checklist for pull requests (e.g., "Does this change require AGENTS.md updates?") improves contribution quality.

- [ ] **Test the full setup flow on a clean machine** — Clone the repo fresh, open a new AE project, and run `Scripts/setup.jsx` end-to-end. Verify the walkthrough in `docs/first-automation.md` matches current behavior.

- [ ] **Verify Windows symlink behavior in `setup.jsx`** — The setup script creates symlinks differently on macOS vs Windows. Confirm the Windows path (`mklink`) works correctly and the error messages are helpful if it fails.
