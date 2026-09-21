# Phase C Locked Workstation Implementation Note

## Status

This note translates the locked workstation synthesis in [05-locked-workstation-candidate.html](mockups/phase-c-next-ui-direction/05-locked-workstation-candidate.html) into an implementation plan for the production app.

It is not a redesign brief.

It is an implementation constraint and sequencing note for the next UI pass.

Use this alongside:

- [Resume-Studio-Phase-C-Locked-UX-System.md](../Resume-Studio-Phase-C-Locked-UX-System.md)
- [Resume-Studio-Visual-Language-Spec-v1.md](Resume-Studio-Visual-Language-Spec-v1.md)

## 1. Intent

The locked workstation direction moves Resume Studio further away from:

- a custom form editor
- a web app toolbar shell
- a split-pane dashboard
- a React form surface with document preview beside it

It moves Resume Studio toward:

- structured document composition software
- editorial workstation behavior
- inspector-based professional editing
- document-stage authority

The main implementation goal is to make the editor feel less like a collection of form fields and more like a structured writing instrument beside a persistent document stage.

## 2. Shell Ownership Zones

The shell should be treated as a set of quiet ownership zones, not as one toolbar block.

### Product Identity

`Resume Studio` belongs at the shell level, top-left.

Rules:

- it identifies the software, not the user document
- it should not visually compete with the document title
- it should not live inside a pill, badge, or toolbar card

### Export Placement

`Export PDF` belongs at the shell level, top-right.

Rules:

- it remains the clearest document-level action
- it should stay restrained rather than promotional
- it should not be grouped into a large command center

### Document Title and Template Placement

Template name and document name belong to the editor column, not the global shell.

Rules:

- template name appears above the user document name
- the user document name is the primary editor identity line
- both belong at the top of the editor working surface
- this area replaces the current editor header language rather than adding another layer

### Undo and Redo Placement

`Undo` and `Redo` belong at the top-right of the editor column.

Rules:

- they are editor-owned actions, not shell-owned actions
- they should read as local editing controls
- they should be low-chrome text actions or similarly restrained controls

### Saved-State Placement

Saved-state belongs in the preview region, upper-right.

Rules:

- it should read as quiet document-state metadata
- it should not look like a status badge
- it should not sit in the global shell if that adds app-like noise

### Page Count Placement

Page count belongs near the preview stage header.

Rules:

- prefer `2 pages` or equivalent quiet count language
- do not use `Near Limit` style product language
- do not elevate page count into a global warning state unless actual overflow behavior requires it later

## 3. What Changes First

The first workstation pass should change shell ownership and editing language before any deeper rendering or schema work.

### First Shell Changes

1. Remove the remaining unified toolbar feel.
2. Replace it with distributed ownership:
   - Resume Studio top-left
   - Export PDF top-right
   - editor-owned title/template/undo/redo
   - preview-owned saved-state/page count
3. Keep geometry and preview anchoring from the current corrected desktop shell.

### Editor Header Restructuring

The current editor header should be replaced with:

- template name above document name
- optional brief editor context below
- undo/redo aligned to the editor header right edge

Do not keep:

- app-like stacked metadata
- top-of-editor hero tone
- extra explanatory copy

### Preview Metadata Placement

The preview should gain a quiet stage header area for:

- page count
- saved-state

This is not a preview redesign.

It is metadata relocation and ownership cleanup only.

### Page Count Replacing `Near Limit`

For this pass:

- replace top-level `Near Limit` style messaging with page count language
- preserve underlying measurement logic
- treat the measurement result as document context, not as product warning theater

## 4. Work Experience Editing Language

Work Experience is the primary area where the production app still feels too form-based.

The next editing-language pass should focus here first.

### Inspector-Style Metadata Rows

Role metadata should move toward aligned property rows for:

- title
- company
- dates
- location

Rules:

- rows should feel like structured document instrumentation
- labels should be brief and consistent
- surfaces should stay quiet and low-chrome
- metadata editing should not look like a settings form

### Composition-Style Bullet Editing

Bullets should move away from generic textarea stacks and toward structured composition pieces.

Rules:

- each bullet should feel like an editable document fragment
- bullet-level actions should be quiet text actions
- bullet grouping should read as authored content, not repeated app controls

This does not require inline rich text.

It requires changing presentation language and grouping first.

### Reduced Form Feeling

To reduce the form feeling:

- reduce repeated input-box framing
- reduce boxed group stacks
- keep local density high
- make metadata and writing feel like parts of one system

### Low-Chrome Text Actions

Prefer:

- `Edit`
- `Move`
- `Remove`
- `Add bullet`

Avoid:

- button-heavy action clusters
- colorful destructive actions in resting state
- miniature dashboard controls

## 5. What Must Not Change Yet

The workstation pass must not expand scope into rendering or data-model work unless a small local adjustment becomes unavoidable.

Do not change yet:

- [ClassicTemplate.tsx](../src/components/resume/ClassicTemplate.tsx)
- export and PDF rendering internals
- page measurement logic
- preview rendering internals
- resume schema, unless a minimal structural addition is strictly required

Also avoid:

- new AI systems
- onboarding systems
- guidance expansion
- new feature architecture
- animation work beyond existing structural behavior

## 6. Recommended Implementation Stages

Implementation should happen in small patches with validation after each one.

### Stage A: Shell Ownership Realignment

Goal:

- move the current shell toward the locked workstation ownership model

Changes:

- reduce the current toolbar band
- move product identity to shell top-left
- keep export at shell top-right
- move document name/template into the editor column
- move undo/redo into the editor column
- move page count and saved-state into the preview region

Likely files:

- [ResumeEditor.tsx](../src/components/resume/ResumeEditor.tsx)
- [globals.css](../src/app/globals.css)

Validation:

- `npm run lint`
- `npm run build`
- manual browser review at desktop widths
- confirm export still works
- confirm preview anchoring is preserved

Risk:

- moderate layout churn if toolbar responsibilities are moved too broadly at once

Rollback point:

- revert to current Stage 5 shell if ownership becomes visually noisy or breaks desktop alignment

### Stage B: Preview Metadata Reassignment

Goal:

- make page count and saved-state preview-owned instead of shell-owned

Changes:

- add quiet preview stage metadata region
- replace `Near Limit` style language with page count
- preserve measurement behavior

Likely files:

- [ResumeEditor.tsx](../src/components/resume/ResumeEditor.tsx)
- [globals.css](../src/app/globals.css)

Validation:

- confirm page count displays cleanly
- confirm no preview geometry drift
- confirm print/export path is unchanged

Risk:

- low to moderate

Rollback point:

- revert metadata placement without touching layout geometry

### Stage C: Work Experience Metadata Language

Goal:

- convert role metadata editing from form-feeling stacks toward inspector rows

Changes:

- align title/company/dates/location into inspector-style rows
- reduce field framing repetition
- keep current editing behavior intact

Likely files:

- [ResumeEditor.tsx](../src/components/resume/ResumeEditor.tsx)
- [globals.css](../src/app/globals.css)

Validation:

- edit all role metadata fields
- confirm save/update behavior still works
- confirm section expansion still works

Risk:

- moderate because this touches dense editing UI

Rollback point:

- revert row presentation without touching section architecture

### Stage D: Bullet Composition Language

Goal:

- make bullet editing feel like structured composition rather than stacked textareas

Changes:

- regroup bullet editing into quieter composition pieces
- reduce visible button weight
- keep bullet add/remove/edit behavior intact

Likely files:

- [ResumeEditor.tsx](../src/components/resume/ResumeEditor.tsx)
- [globals.css](../src/app/globals.css)

Validation:

- add bullet
- edit bullet
- remove bullet
- confirm preview updates still work

Risk:

- moderate because it changes the most form-heavy part of the editor

Rollback point:

- revert bullet presentation while preserving shell ownership improvements

## 7. Validation Rules For Every Patch

After each patch:

- run `npm run lint`
- run `npm run build`
- test in browser at desktop width
- edit Work Experience fields and bullets
- confirm preview still updates
- confirm export still functions
- confirm no accidental outer page scroll handoff was introduced

## 8. Risks To Watch

### Risk: drifting back into toolbar centralization

If shell actions, editor identity, and preview state all collapse back into one strip, the workstation distinction is lost.

### Risk: literal mockup translation

The mockup is a directional reference.

It should guide ownership, density, and editing language, not force rigid pixel copying where the production app needs pragmatic adaptation.

### Risk: field boxes still reading as generic forms

Inspector rows alone do not solve the problem if each row still looks like a default web form control.

### Risk: preview becoming a secondary widget

Saved-state and page count should reinforce preview ownership, not make the preview feel like another panel with app chrome.

## 9. Recommended First Production Patch

The first implementation patch should be shell ownership realignment only.

Patch scope:

- remove the remaining unified toolbar feel
- place `Resume Studio` at shell top-left
- keep `Export PDF` at shell top-right
- move template name above document name in the editor column
- move `Undo` and `Redo` to the top-right of the editor column
- add quiet preview metadata for page count and saved-state
- replace `Near Limit` style language with page count language where feasible without touching measurement logic

Do not include in the first patch:

- Work Experience inspector row conversion
- bullet composition restructuring
- preview framing redesign
- schema changes

## 10. Acceptance Criteria For The First Patch

- shell-level product identity is separate from document identity
- export remains easy to find at the shell top-right
- editor title area owns template name, document name, and undo/redo
- preview owns saved-state and page count
- `Near Limit` style messaging is removed from primary shell language
- the workspace still preserves anchored document-stage behavior
- preview rendering and export continue to work unchanged

## 11. What To Avoid During Implementation

- rebuilding the whole shell in one patch
- reintroducing loud toolbar chrome
- converting everything into button clusters
- leaving old and new ownership models on screen at the same time
- touching `ClassicTemplate`
- touching measurement logic unless absolutely required
- turning the Work Experience pass into a schema rewrite
