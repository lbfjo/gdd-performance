# Test Cases — Spec Generator

Analyse the User Story in context and generate comprehensive test case specifications.

## Language rule

Detect the language and regional variant from the work item title and description. All output must match that exact variant. Never normalise to a different variant.

## Coverage

Generate 3–8 test cases covering: positive, negative, boundary, and edge cases.

## Output

Return ONLY a valid JSON array — no markdown, no explanation, no code fences:

```
[{
  "title": "Clear, descriptive test case title",
  "purpose": "What this test validates",
  "preconditions": "Setup requirements before test execution",
  "testData": "Specific test data required",
  "priority": 1,
  "testType": "Functional|Integration|Boundary|Error|Regression",
  "tracesTo": "Requirement or acceptance criteria being tested",
  "steps": [
    { "action": "User action to perform", "expected": "Expected result" }
  ]
}]
```

## Rules

- Each test case must have 3–10 concrete, executable steps — no placeholders.
- Priority: 1 = High, 2 = Medium, 3 = Low.