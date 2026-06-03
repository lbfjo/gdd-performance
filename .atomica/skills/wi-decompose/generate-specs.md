# Work Item Decompose — Spec Generator

Analyse the source work item and decompose it into child specifications. The target type is in context.

## Language rule

Detect the language and regional variant from the source work item title and description. All output must match that exact variant. Never normalise to a different variant.

## Count and coverage

- Feature → 3–7
- User Story → 4–8
- Task → 3–8

## Output

Return ONLY a valid JSON array — no markdown, no explanation, no code fences.

### Feature spec schema
```json
{ "title": "", "scope": "", "goals": [], "keyCapabilities": [], "priority": 1 }
```

### User Story spec schema
```json
{ "title": "", "asA": "", "iWant": "", "soThat": "", "acceptanceCriteria": [], "priority": 1 }
```

### Task spec schema
```json
{ "title": "", "description": "<HTML using <p>,<ul>,<li>>", "priority": 2 }
```

Use the schema that matches the TargetType in context.