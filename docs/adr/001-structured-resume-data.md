# ADR 001: Structured Resume Data

## Status

Accepted

---

## Context

Resume Studio is designed around structured editing and controlled templates rather than unrestricted document editing.

The application requires:
- predictable rendering
- consistent formatting
- stable PDF export
- reusable templates
- editable resume sections
- ATS friendly output

Using arbitrary rich text or freeform document editing would significantly increase rendering complexity and formatting instability.

Structured content should primarily consist of:
- fields
- lists
- ordered sections
- bullet collections

rather than unrestricted rich text documents.

---

## Decision Drivers

- rendering consistency
- predictable PDF export
- simpler template rendering
- ATS friendliness
- reduced formatting instability
- maintainable architecture
- structured editing workflows

---

## Decision

Resume Studio will store resumes as structured, schema driven data.

Resume content will be organized into predictable sections such as:
- summary
- skills
- experience
- projects
- education
- certifications

Templates will consume structured resume data as input and remain presentation focused.

Templates should remain downstream presentation layers rather than primary content storage systems.

---

## Alternatives Considered

### Freeform Document Editing

Rejected because:
- formatting becomes unstable
- template rendering becomes harder
- PDF consistency becomes less predictable

### Rich Text Editor Based Documents

Rejected because:
- introduces unnecessary complexity for the MVP
- conflicts with the controlled template philosophy
- increases rendering and export complexity

---

## Consequences

### Positive

- more reliable rendering behavior
- more predictable PDF export
- easier template support
- easier section reordering
- easier future integrations
- better formatting consistency

### Negative

- less layout freedom for users
- reduced support for arbitrary formatting
- ongoing schema evolution and maintenance

---

## Notes

This decision aligns with the project's goals of:
- controlled formatting
- template driven rendering
- ATS friendly output
- local first simplicity
- maintainable architecture