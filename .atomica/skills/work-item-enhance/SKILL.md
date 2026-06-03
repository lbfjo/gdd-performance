---
id: work-item-enhance
name: Work Item Enhance
description: Enhance Azure DevOps work items using AI — improves title, description, acceptance criteria, and bug repro steps while preserving the original language variant. Use alongside IDevOpsWorkItems.
version: 1.7.0
trigger: "enhance work item|improve work item|enrich work item|refine work item"
outputs: updated Azure DevOps work item
---

# Skill: Work Item Enhance

## Language Rule — Mandatory

Detect the language from the **work item title**. If ambiguous, use the description.
All output — titles, descriptions, comments, acceptance criteria — must match that exact language and regional variant.
Never mix languages. Never default to Portuguese if the title is in English.

## Field Routing — Mandatory

Different work item types use different fields for narrative content:

- **Bug**: narrative goes to `Microsoft.VSTS.TCM.ReproSteps` (the visible "Description" in the Bug form), NOT `System.Description`.
- **User Story / Epic / Feature / Task**: narrative goes to `System.Description`.
- **Bug / User Story / Test Case**: acceptance criteria go exclusively to `Microsoft.VSTS.Common.AcceptanceCriteria` — never duplicated in the description field.

## Step 1 — Fetch

```
(bind work-item    (call :tool "IDevOpsWorkItems" :method "GetWorkItemAsync" :id <id> :includeRelations true))
(bind wi-comments  (call :tool "IDevOpsWorkItems" :method "GetWorkItemCommentsAsync" :workItemId <id>))
```

## Step 2 — GROUNDING: Read Instructions

Read `generate.md` from the skill folder — it defines the enhancement rules, field constraints, and output format.

```
(bind enhance-instructions (read generate-md-path))
```

## Step 3 — COMPOSITION: Compose Enhanced Work Item

With the work item, comments, and instructions all bound, compose the enhanced JSON directly.
Follow `generate.md` exactly — output format, field rules, language preservation, writable fields.

```
(bind enhanced-work-item (compose <enhanced JSON following generate.md rules>))
```

## Step 4 — Update

```
(call :tool "IDevOpsWorkItems" :method "UpdateWorkItemAsync" :partialWorkItem enhanced-work-item)
```

## Step 5 — Comment

After updating, add a comment to the work item signed by Atomica summarising what was improved. Use `AddCommentAsync`.

One line only — what was enhanced. Sign as **Atomica**.

```
(call :tool "IDevOpsWorkItems" :method "AddCommentAsync"
      :workItemId <id>
      :comment <one-line summary signed by Atomica>)
```