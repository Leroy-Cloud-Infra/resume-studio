# UI Notes

## Overview

Resume Studio should provide a focused editing workflow for structured resume content and live resume preview.

The UI should help users edit resume content quickly while keeping layout and formatting controlled by templates.

The user edits content.

The template controls presentation.

---

## Phase 1 UI Goal

Phase 1 should prove that a user can:
- edit structured resume sections
- see a live preview
- generate a usable PDF

The UI does not need to be visually polished yet.

The goal is workflow validation, not final design.

---

## Primary Layout

Phase 1 should use a two panel layout:

```txt
Editor Panel | Preview Panel
```

### Editor Panel

The editor panel is where users modify structured resume content.

It should include:
- resume title
- template selector
- section editor list
- editable section fields
- bullet editing controls

### Preview Panel

The preview panel shows the rendered resume.

It should:
- update as content changes
- use the selected template
- visually approximate export output
- make formatting issues visible early

---

## Primary User Flow

1. User opens Resume Studio
2. User sees an editable resume
3. User edits structured fields and bullet points
4. Preview updates from the same resume data
5. User adjusts content as needed
6. User exports PDF

---

## Phase 1 Sections

Phase 1 should support editing:
- header/contact information
- summary
- skills
- experience
- projects
- education
- certifications

Sections may be simple at first.

The priority is proving the structured editing and rendering workflow.

---

## Editor Interaction Principles

The editor should prioritize:
- clarity
- speed
- low friction editing
- predictable behavior
- minimal formatting controls
- easy bullet editing
- clear section boundaries

The editor should avoid:
- freeform page editing
- drag and drop layout design
- complex style controls
- unnecessary animation
- advanced customization

---

## Preview Principles

The preview should:
- reflect the selected template
- use the same structured resume data as the editor
- reveal layout and overflow issues early
- stay visually close to exported PDF output

The preview does not need perfect final polish during Phase 1.

---

## Export Interaction

PDF export should be available from the main editing screen.

The export action should:
- use the selected template
- use the current resume data
- generate a PDF from the controlled rendering pipeline

---

## Future UI Considerations

Future releases may include:
- section collapse and expand
- drag to reorder sections
- compact mode toggles
- page overflow warnings
- keyboard shortcuts
- improved empty states
- multiple resume management views
- richer template browsing

These are not required for Phase 1.

---

## Open Questions

- should the preview update instantly or after a short debounce?
- should section editing happen inline or inside expandable panels?
- should the export button live in the editor header or preview header?
- how should page overflow warnings appear?
- should Phase 1 include section reordering or defer it?