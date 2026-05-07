# ADR 002: HTML/CSS Rendering Strategy

## Status

Accepted

---

## Context

Resume Studio requires:
- live resume preview
- reliable PDF export
- consistent formatting
- reusable templates
- ATS friendly output
- maintainable rendering behavior

The application must support rendering resumes in a way that minimizes differences between:
- editor preview
- browser rendering
- exported PDFs

Using separate rendering systems for preview and export would increase maintenance complexity and formatting inconsistencies.

The rendering pipeline intentionally relies on browser native layout and print behavior as part of the rendering system.

Templates should avoid rendering approaches that reduce text extractability or machine readability.

---

## Decision Drivers

- rendering consistency
- reusable rendering logic
- predictable PDF export
- maintainable template architecture
- reduced duplication
- browser native layout capabilities
- print oriented document rendering
- ATS friendliness

---

## Decision

Resume Studio will use HTML and CSS as the primary rendering system for both live preview and PDF generation.

Resume templates will be implemented as reusable rendering components using standard web technologies.

The application should reuse the same rendering components for:
- live preview
- print rendering
- PDF export

whenever possible.

Puppeteer will be used to generate PDFs from rendered HTML/CSS templates.

---

## Alternatives Considered

### Manual PDF Rendering

Rejected because:
- layout logic becomes significantly more complex
- typography handling becomes harder
- preview and export consistency becomes difficult
- development speed decreases

### Separate Preview and Export Renderers

Rejected because:
- creates duplicated rendering logic
- increases maintenance burden
- increases formatting drift risk
- complicates template development

### Canvas Based Rendering

Rejected because:
- reduces accessibility
- complicates text rendering
- creates additional print and export complexity
- conflicts with ATS friendly goals

---

## Consequences

### Positive

- shared rendering logic between preview and export
- easier template development
- browser native layout handling
- improved maintainability
- reduced rendering duplication
- simpler rendering architecture

### Negative

- CSS print styling complexity
- browser specific rendering differences may still require testing and refinement
- page overflow management requires careful handling
- print layouts may require iterative refinement

---

## Notes

This decision aligns with the project's goals of:
- controlled formatting
- stable PDF export
- maintainable templates
- local first simplicity
- predictable rendering behavior

Rendering consistency between preview and export is considered a core architectural priority for the MVP.

Resume templates should prioritize print readability and export stability over highly dynamic screen only layouts.

The MVP does not attempt pixel identical rendering across all browsers and operating systems.