# PRP: [Feature Name]

## Goal

### Feature Goal

[1-2 sentences describing what this feature/fix accomplishes]

### Deliverable

[Concrete output - files created/modified, behavior changes]

### Success Definition

[How do we know this is complete and correct?]

---

## Context

### Relevant Files

```yaml
primary:
  - path: [exact file path]
    reason: [why this file is relevant]
    patterns: [specific patterns to follow in this file]

secondary:
  - path: [supporting files]
    reason: [context they provide]
```

### External References

```yaml
documentation:
  - url: [full URL with anchors]
    topic: [what to find here]

examples:
  - url: [GitHub/SO/blog links]
    relevance: [how this helps implementation]
```

### Gotchas & Pitfalls

```yaml
- issue: [potential problem]
  mitigation: [how to avoid it]
```

---

## Implementation Tasks

### Task 1: [Task Name]

**Depends on:** None
**Files:** [exact files to modify]
**Action:** [specific implementation steps]
**Verification:** [how to verify this task is complete]

### Task 2: [Task Name]

**Depends on:** Task 1
**Files:** [exact files to modify]
**Action:** [specific implementation steps]
**Verification:** [how to verify this task is complete]

[Continue for all tasks...]

---

## Validation Gates

### Pre-Implementation

- [ ] [Prerequisite check]

### During Implementation

- [ ] [Progress check]

### Post-Implementation

- [ ] [Final verification]

### Test Commands

```bash
# Run tests
[test command]

# Build verification
[build command]
```

---

## Final Validation Checklist

- [ ] All tasks completed
- [ ] All validation gates passed
- [ ] No regressions introduced
- [ ] Code follows existing patterns
- [ ] Documentation updated (if applicable)

---

## Confidence Score

**Implementation Success Likelihood:** [1-10]

**Reasoning:** [Why this score?]
