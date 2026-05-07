# ADR 004: AI Features Deferred Outside MVP

## Status

Accepted

---

## Context

Resume Studio is intended to support structured resume editing, template rendering, and reliable PDF export within a local first architecture.

AI assisted resume tooling is increasingly common, but introducing AI systems during the MVP phase would significantly increase:
- implementation complexity
- workflow ambiguity
- UX complexity
- integration requirements
- maintenance burden
- scope expansion risk

The MVP prioritizes deterministic editing and rendering behavior over generative workflow features.

The current MVP focus is validating:
- structured editing workflows
- controlled template rendering
- rendering consistency
- PDF export reliability
- local first usability

The core application must remain useful without requiring AI systems.

Resume Studio should support AI assisted workflows without becoming AI dependent.

---

## Decision Drivers

- focused MVP scope
- reduced implementation complexity
- deterministic editing workflows
- predictable user experience
- simpler UX design
- local first architecture priorities
- reduced external dependencies
- validating core product architecture first

---

## Decision

AI features are intentionally deferred outside the MVP scope.

The MVP will not include:
- AI generated resume writing
- AI generated summaries
- automatic bullet generation
- AI resume scoring
- AI workflow automation
- mandatory AI integrations

Users are responsible for creating or sourcing resume content outside the MVP application workflow.

Users may:
- manually write content
- import existing content
- or use their preferred AI or LLM workflows externally

before editing content inside Resume Studio.

The application should remain compatible with future optional AI integrations without requiring them.

---

## Alternatives Considered

### AI Assisted Resume Generation in MVP

Rejected because:
- increases product complexity too early
- shifts focus away from rendering and editing workflows
- introduces additional UX and trust challenges
- expands maintenance requirements
- complicates local first architecture decisions

### Mandatory AI Integrated Workflow

Rejected because:
- conflicts with local first and privacy goals
- increases external dependency requirements
- reduces workflow flexibility
- weakens offline usability

---

## Consequences

### Positive

- simpler MVP scope
- faster validation of the core product architecture
- reduced maintenance burden
- clearer editing workflows
- improved privacy and local first alignment
- fewer external dependencies

### Negative

- users must create or source content externally
- AI assisted workflows are less integrated initially
- future AI integration architecture may require additional planning

---

## Notes

This decision aligns with the project's goals of:
- focused MVP execution
- local first simplicity
- maintainable architecture
- privacy oriented workflows
- controlled editing experiences

Deferring AI features helps preserve focus on validating the core rendering and editing architecture first.

AI integration is deferred rather than permanently rejected.

Future releases may support:
- local LLM integrations
- optional external AI providers
- bullet refinement
- summary rewriting
- job posting analysis
- keyword optimization

Future AI integrations should prioritize optional local first workflows where practical.

AI features should remain optional and should not replace the core structured editing workflow.

The MVP is not intended to compete with AI first resume generation platforms.