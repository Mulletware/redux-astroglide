# Product Requirements Plans (PRPs)

PRPs are comprehensive planning documents designed to enable **one-pass implementation success** through systematic research and context curation.

## Philosophy

The executing AI agent only receives:

- The PRP content
- Its training data knowledge
- Access to codebase files (but needs guidance on which ones)

Therefore, PRPs must contain all necessary context for successful implementation without prior codebase knowledge.

## PRP Structure

Each PRP follows a standard structure:

1. **Goal Section** - Feature Goal, Deliverable, Success Definition
2. **Context Section** - YAML structure with files, URLs, patterns, gotchas
3. **Implementation Tasks** - Dependency-ordered tasks with specific guidance
4. **Validation Gates** - Project-specific commands and test criteria

## Naming Convention

PRPs are numbered: `{XXX-feature-name}.md`

Example: `001-persist-initial-value-bug.md`

## Quality Standards

- Passes "No Prior Knowledge" test
- All references are specific and actionable
- File patterns point to specific examples
- URLs include section anchors where possible
- Task specifications use information-dense keywords from codebase
