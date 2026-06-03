---
name: composer
description: >
  Inspect once at the start of any composition task. Defines the full
  workflow for reading, composing, validating, and responding. Agent-only —
  never used by Lead.
---

# Composer Skill

## Step 0 — Orient

Read your task instruction carefully. Extract the file list you own, the conventions passed by Lead (namespace pattern, base class, interfaces), and any bindings already in scope. Bindings inherited from Lead are referenced by name (`${name}` or `(ref "name")`) — never re-read a file you can already reach through a binding; check PAST for the bind receipts in prior `[ATOML RESULTS]`. Use `[WORKSPACE]` for project structure — do not inspect the whole workspace.

## Step 1 — Ground

For every type, base class, or interface you will reference — resolve it via `ILanguageServer.ResolveType` and `ILanguageServer.GetMembers` before composing. Never guess a namespace, constructor, or method signature. Bind the results — never call the same resolution twice. If a type is unknown, search the KB or grep the workspace for existing usage first.

**Do not invent types.** If a type isn't in your grounding, scaffold, or KB results, it probably doesn't exist in this codebase — `GenericListDto<>`, `OperationResult<T>`, and similar patterns are training-data reflexes, not M3DF. Grep the workspace for a similar pattern or ask Lead. Creating a file to satisfy a type you invented is the wrong direction.

**Do not invent members.** `GetMembers` tells you what exists. If a method wasn't returned — it doesn't exist. Names that feel right but weren't in `GetMembers` output (like `RemoveByIdAsync`, `CommitChanges`, `GetProvider<T>`) are training-data reflexes, not this codebase.

**Resolve the full call chain.** "Types you reference" means every type your code traverses, not just the ones you declare. An operation using a repository actually uses: operation base → execution context → provider → repository → unit of work. Call `GetMembers` on every link before composing, not just the top type. Resolving the base class alone is not grounding — you will invent member names on everything downstream.

**When GetMembers doesn't return the method you expect — it's inherited.** Resolve the parent type and call GetMembers on it. If still not found — grep the workspace for the method name. After 2 failed resolution attempts — ask the Lead.

**Large files: grep then peek.** For any file over 300 lines, grep for the method or symbol you need before peeking. Use the grep line numbers to peek the exact range. Never read successive line windows hoping to find something — that wastes engine turns.

In general, do not propose changes to code you haven't read. Read existing files only if you are editing them. Read the relevant lines only — read the full file only if more than 30% is changing.

## Step 2 — Build Turn

One engine turn = one focused pass, closed with validation.

- Simple files (DTOs, entities, interfaces, configs) → pack many per turn.
- Complex files (operations, application class, wiring) → one per turn.
- Write each file completely — no placeholders, no TODOs. Edit in place for existing files.
- Close every turn with `(peek (call :tool "ILanguageServer" :method "GetDiagnostics" ...))` on the files touched.

### Edit Safety — Line-Number Accuracy

When editing existing files with `:edits`, line-number accuracy is critical. Wrong line numbers corrupt files silently.

- **Always peek or read the file with line numbers immediately before composing edits.** Never rely on line numbers from a previous engine turn — the file may have changed.
- **For multi-edit operations, include ALL edits in a single `(write ... :edits ...)` call.** The engine applies edits bottom-up, keeping line numbers stable. Splitting into multiple write calls causes drift.
- **Never guess line numbers from memory.** If you don't have current line numbers from a peek/read/grep in THIS engine turn, re-read first.
- **Verify the `postEditSnippet` returned by each write before moving on.** Every write op returns line-numbered context around the touched region (`→` marker on changed lines) — that's the literal post-write bytes, the stop sign between a silent misfire (wrong file, stale peek, guardrail skipped) and a confidently-wrong summary. Don't re-peek to verify; the snippet IS the verification. Full guardrail catalogue in `atoml.io.write`.

Do not create files unless absolutely necessary. If an approach fails, diagnose why before switching tactics.

## Step 3 — Validate

Only `severity: error` blocks you. Warnings are noise — never spend an engine turn on them. Fix and re-validate in the same engine turn — one edit may expose another error.

Fix with `:edits`, not recomposition — edit the specific error. Structured files (XML, JSON, csproj) always `:edits`, never recompose.

Fix escalation: `:edits` → re-validate same engine turn → repeat. After 2 failed fixes on the same file → `restore`, then `:edits` from clean state. Unknown symbol → `ResolveType` or grep for existing usage → search KB → after 3 failures on the same error, ask Lead with the exact diagnostic output.

**When a diagnostic points to a missing member**, pack the probes: `GetMembers` on the declared type, `GetMembers` on known base types, `grep` for the method name — all in one engine turn. Use results together.

## Step 4 — Respond

**Validation is `GetDiagnostics` only.** You do not have `IBash`. You do not run `dotnet build`, `dotnet test`, `dotnet restore`, or any shell command. `GetDiagnostics` green is your gate — build and tests are the Lead's responsibility.

Checklist:
- [ ] `GetDiagnostics` returned zero `severity: error` diagnostics
- [ ] Every file in scope has been written
- [ ] No files created beyond what was necessary

If any item is unchecked — fix first. Respond with a concise summary of files written and key type resolutions made.
