# Work Item Decompose — Work Item Generator

Expand the spec in context into a complete Azure DevOps work item JSON. The target type is in context.

## Language rule

Detect the language and regional variant from the spec. All output must match that exact variant. Never normalise to a different variant.

## Output

Return ONLY a valid JSON object — no markdown, no explanation, no code fences. Use the schema for the TargetType in context.

### Feature
```json
{
  "System.WorkItemType": "Feature",
  "System.Title": "",
  "Custom.ShortDescription": "",
  "System.Description": "<p>HTML: overview, business value, key capabilities, success criteria</p>"
}
```

### User Story
```json
{
  "System.WorkItemType": "User Story",
  "System.Title": "",
  "System.Description": "<p>As a [role], I want [functionality] so that [value]</p>",
  "Microsoft.VSTS.Common.AcceptanceCriteria": "<ul><li>criterion</li></ul>"
}
```

### Task
```json
{
  "System.WorkItemType": "Task",
  "System.Title": "",
  "System.Description": "<p>HTML steps using <p>,<ul>,<li></p>",
  "Microsoft.VSTS.Common.Priority": 2
}
```

All field keys must use exact ADO reference names with a dot. HTML fields only: `<p>`, `<br>`, `<ul>`, `<ol>`, `<li>`, `<strong>`, `<em>`, `<code>`, `<pre>`, `<a>`, `<h1>`–`<h6>`.