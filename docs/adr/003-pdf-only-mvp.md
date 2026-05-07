# ADR 003: PDF Only Export for MVP

## Status

Accepted

---

## Context

Resume Studio requires a reliable export format suitable for:
- job applications
- resume sharing
- ATS compatibility
- predictable formatting
- local first workflows

The application must prioritize export consistency and implementation simplicity during the MVP phase.

Supporting multiple export formats early in development would significantly increase:
- rendering complexity
- testing requirements
- formatting inconsistencies
- maintenance burden
- support complexity

PDF is the most common and reliable submission format for resumes.

PDF export also helps preserve layout consistency across:
- operating systems
- browsers
- submission workflows

The MVP treats exported PDFs as finalized distribution documents rather than editable working documents.

---

## Decision Drivers

- export consistency
- implementation simplicity
- predictable formatting
- ATS friendliness
- reduced maintenance burden
- reduced support complexity
- stable MVP scope
- faster validation of the core rendering architecture

---

## Decision

Resume Studio will support PDF export only for the MVP.

PDF generation will use the shared HTML/CSS rendering pipeline and Puppeteer export workflow defined in the rendering architecture.

The MVP will not support:
- DOCX export
- rich text export
- editable document export
- alternate print/export formats

---

## Alternatives Considered

### DOCX Export

Rejected because:
- Word document rendering introduces additional formatting complexity
- layout consistency becomes harder to maintain
- DOCX generation libraries add implementation overhead
- cross platform document consistency becomes less predictable

### Multiple Export Formats in MVP

Rejected because:
- increases scope too early
- slows validation of the core rendering architecture
- increases maintenance and testing requirements
- introduces unnecessary export edge cases

### Browser Print Only Without Dedicated PDF Export

Rejected because:
- reduces export consistency
- introduces more user environment variability
- weakens control over formatting behavior

---

## Consequences

### Positive

- simpler export architecture
- more predictable formatting
- reduced implementation complexity
- easier testing and validation
- stronger rendering consistency
- faster MVP development

### Negative

- users cannot edit exported resumes in external document editors
- users requiring DOCX workflows are not supported initially
- future export formats may require separate rendering and formatting strategies

---

## Notes

This decision aligns with the project's goals of:
- reliable formatting
- controlled rendering
- maintainable architecture
- focused MVP scope
- local first simplicity

Additional export formats are deferred rather than permanently rejected.

Additional export formats may be reconsidered after the rendering pipeline and template architecture are validated.