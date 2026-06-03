# Test Cases — Work Item Generator

Create a complete Azure DevOps Test Case work item from the specification in context.

## Language rule

Detect the language and regional variant from the spec. All output must match that exact variant. Never normalise to a different variant.

## Output

Return ONLY a valid JSON object — no markdown, no explanation, no code fences:

```
{
  "System.WorkItemType": "Test Case",
  "System.Title": "<title from spec>",
  "System.Description": "<p><strong>Test Objective:</strong> purpose</p><p><strong>Preconditions:</strong> preconditions</p><p><strong>Test Data:</strong> testData</p><p><strong>Test Type:</strong> testType</p><p><strong>Traces To:</strong> tracesTo</p>",
  "Microsoft.VSTS.Common.Priority": <priority>,
  "Microsoft.VSTS.TCM.Steps": "<steps XML as single-line string>"
}
```

## Steps XML format

`Microsoft.VSTS.TCM.Steps` must be a single-line XML string. Use actual `<` and `>` characters — no HTML entities. The `last` attribute must equal the number of steps. Step IDs start from 1.

```
<steps id='0' last='N'>
  <step id='1' type='ActionStep'>
    <parameterizedString isformatted='true'>Action</parameterizedString>
    <parameterizedString isformatted='true'>Expected result</parameterizedString>
    <description/>
  </step>
</steps>
```

Generate exactly the number of steps in the spec. No placeholders.