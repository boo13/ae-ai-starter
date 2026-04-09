# GitHub Issue Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two YAML issue form templates (bug report and feature request) to `.github/ISSUE_TEMPLATE/` so contributors are guided to provide useful information.

**Architecture:** Two standalone YAML files placed in `.github/ISSUE_TEMPLATE/`. GitHub picks them up automatically — no code changes, no config file needed. Each file uses GitHub's issue form schema with `type: dropdown`, `type: textarea`, and `type: checkboxes` fields.

**Tech Stack:** GitHub issue forms YAML schema (no dependencies, no build step)

---

### Task 1: Create bug report template

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`

- [ ] **Step 1: Create the file**

Create `.github/ISSUE_TEMPLATE/bug_report.yml` with this exact content:

```yaml
name: Bug Report
description: Something isn't working as expected
labels: ["bug"]
body:
  - type: dropdown
    id: ae-version
    attributes:
      label: After Effects version
      options:
        - "2025"
        - "2024"
        - "2023"
        - "2022"
        - Other
    validations:
      required: true

  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Describe what went wrong. Include any error messages you saw.
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      placeholder: |
        1. Open AE with...
        2. Run script...
        3. See error...
    validations:
      required: true

  - type: textarea
    id: last-run
    attributes:
      label: last_run.json output
      description: Optional — paste the contents of `Scripts/runs/last_run.json` after the error occurred.
      render: json
```

- [ ] **Step 2: Commit**

```bash
git add .github/ISSUE_TEMPLATE/bug_report.yml
git commit -m "feat: add bug report issue template"
```

---

### Task 2: Create feature request template

**Files:**
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`

- [ ] **Step 1: Create the file**

Create `.github/ISSUE_TEMPLATE/feature_request.yml` with this exact content:

```yaml
name: Feature Request
description: Suggest an idea or improvement
labels: ["enhancement"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem / motivation
      description: What are you trying to do? What's the pain point?
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
      description: Describe what you'd like to see added or changed.
    validations:
      required: true

  - type: checkboxes
    id: ae-versions
    attributes:
      label: After Effects version(s) this affects
      options:
        - label: "2025"
        - label: "2024"
        - label: "2023"
        - label: "2022"

  - type: textarea
    id: context
    attributes:
      label: Additional context
      description: Screenshots, links, examples — anything else that helps.
```

- [ ] **Step 2: Commit**

```bash
git add .github/ISSUE_TEMPLATE/feature_request.yml
git commit -m "feat: add feature request issue template"
```

---

### Task 3: Verify on GitHub

- [ ] **Step 1: Push to remote**

```bash
git push
```

- [ ] **Step 2: Confirm templates appear**

Go to `https://github.com/boo13/ae-ai-starter/issues/new/choose` and verify both templates appear: "Bug Report" and "Feature Request".

- [ ] **Step 3: Close issue**

```bash
gh issue close 7 --repo boo13/ae-ai-starter --comment "Added bug report and feature request YAML form templates in .github/ISSUE_TEMPLATE/."
```
