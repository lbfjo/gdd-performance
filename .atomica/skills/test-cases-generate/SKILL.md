---
id: test-cases-generate
name: Test Cases Generate
description: Generate Azure DevOps Test Cases from a User Story — creates specs, builds work items with TCM steps XML, organises into a test suite. Use alongside IDevOpsWorkItems and IDevOpsTestPlanning.
version: 1.0.0
trigger: "generate test cases|create test cases|test cases for|test coverage"
outputs: test case work items linked to suite
---

# Skill: Test Cases Generate

## Language Rule — Mandatory

Detect the language from the **work item title**. If ambiguous, use the description.
All output — titles, descriptions, comments, acceptance criteria — must match that exact language and regional variant.
Never mix languages. Never default to Portuguese if the title is in English.

## Step 1 — Fetch work item and resolve suite

Fetch the User Story with `:includeRelations true`. Extract title (replace `/` with `-`, trim).

Call `GetTestedBySuiteIdAsync` to get the parent suite ID — it finds the `"Microsoft.VSTS.Common.TestedBy-Forward"` relation and extracts the suite ID in one step. Throws if no "Tested By" link exists.

Call `GetSuiteInfoAsync` with that suite ID to get `planId`, `projectName`, `parentSuiteName`.

Fetch comments via `GetWorkItemCommentsAsync` for generation context.

## Step 2 — GROUNDING: Read spec instructions

```
(bind spec-instructions (read generate-specs-path))
```

## Step 3 — COMPOSITION: Compose test case specifications

With the work item, comments, and instructions bound, compose a JSON array of test case specs.
Follow `generate-specs.md` exactly — coverage, schema, language rule, step count rules.

```
(bind test-case-specs (compose <JSON array of test case specs following generate-specs.md>))
```

Output must be a valid JSON array. Parse before iterating.

## Step 4 — Create child suite

```
(call :tool "IDevOpsTestPlanning" :method "EnsureTestSuitePathAsync"
      :project projectName :planId planId
      :suitePath work-item-title :startFromSuiteId parentSuiteId)
```

## Step 5 — GROUNDING: Read test case work item instructions

```
(bind testcase-instructions (read generate-testcase-path))
```

## Step 6 — COMPOSITION + TOOL: Compose and create each test case

For each spec, compose the full test case work item JSON then create it. Follow `generate-testcase.md` exactly — Steps XML format is critical.

```
(bind created-test-cases
  (foreach spec test-case-specs
    (seq
      (bind tc-fields (compose <JSON object for this spec following generate-testcase.md>))
      (bind tc-id (call :tool "IDevOpsWorkItems" :method "CreateOrUpdateWorkItemAsync"
                        :fields tc-fields
                        :parentId workItemId))
      (yield tc-id))))
```

## Step 7 — Add to suite

```
(call :tool "IDevOpsTestPlanning" :method "AddTestCasesToSuiteAsync"
      :project projectName :planId planId
      :suiteId childSuiteId :testCaseIds created-test-cases)
```
## Step 8 — Comment

Add a comment to the source work item signed by Atomica. One line — how many test cases were created and which suite they were added to.

```
(call :tool "IDevOpsWorkItems" :method "AddCommentAsync"
      :workItemId workItemId
      :comment <one-line summary signed by Atomica>)
```