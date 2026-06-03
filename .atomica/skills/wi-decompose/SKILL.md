---
id: wi-decompose
name: Work Item Decompose
description: Decompose a work item into children of a lower type — Epic→Features, Feature→User Stories, any→Tasks. Use alongside IDevOpsWorkItems.
version: 1.0.0
trigger: "decompose|break down|generate features|generate stories|generate tasks|create children|split work item"
outputs: child work items linked to parent
---

# Skill: Work Item Decompose

## Language Rule — Mandatory

Detect the language from the **work item title**. If ambiguous, use the description.
All output — titles, descriptions, comments, acceptance criteria — must match that exact language and regional variant.
Never mix languages. Never default to Portuguese if the title is in English.

Fetch the source work item, infer or confirm the target type, compose specs, then create each child as a linked work item.

---

## Step 1 — Fetch

```
(bind source-wi   (call :tool "IDevOpsWorkItems" :method "GetWorkItemAsync" :id <id> :includeRelations true))
(bind wi-comments (call :tool "IDevOpsWorkItems" :method "GetWorkItemCommentsAsync" :workItemId <id>))
```

## Step 2 — Determine target type

Infer from source type unless the user specified explicitly:

- Epic → Feature
- Feature → User Story
- User Story → Task
- Bug / Task / any → Task

## Step 3 — GROUNDING: Read spec instructions

```
(bind spec-instructions (read generate-specs-path))
```

## Step 4 — COMPOSITION: Compose specs

With the work item, comments, and instructions bound, compose a JSON array of child specs.
Follow `generate-specs.md` exactly — schema, count, language rule, target type.

```
(bind specs (compose <JSON array of specs following generate-specs.md>))
```

Output must be a valid JSON array. Parse it with `(json/parse specs)` before iterating.

## Step 5 — GROUNDING: Read work item instructions

```
(bind wi-instructions (read generate-workitem-path))
```

## Step 6 — COMPOSITION + TOOL: Compose and create each child

For each spec, compose the full work item JSON then create it as a child:

```
(bind created-ids
  (foreach spec specs
    (seq
      (bind wi-fields (compose <JSON object for this spec following generate-workitem.md>))
      (bind wi-id (call :tool "IDevOpsWorkItems" :method "CreateOrUpdateWorkItemAsync"
                        :fields wi-fields
                        :parentId <source-id>))
      (yield wi-id))))
```


## Step 7 — Comment

Add a comment to the source work item signed by Atomica. One line — how many children were created and of what type.

```
(call :tool "IDevOpsWorkItems" :method "AddCommentAsync"
      :workItemId <source-id>
      :comment <one-line summary signed by Atomica>)
```