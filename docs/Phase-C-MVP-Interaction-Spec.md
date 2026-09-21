# Phase C MVP Interaction Spec

## Purpose

This document consolidates the locked Phase C editor and workspace decisions from the design lab into a single implementation-oriented specification.

It is meant to guide MVP implementation behavior, not to reopen product direction.

## Scope

This spec covers:

- editor architecture
- editable surface language
- active editing behavior
- control language
- guidance philosophy
- reorder behavior
- toolbar philosophy
- preview behavior
- motion behavior

This spec does not define:

- new product directions
- visual redesign work outside the locked workspace model
- advanced intelligence systems
- AI coaching or scoring systems

## Core Product Identity

Resume Studio should behave like professional document software for resumes.

The product should feel:

- calm
- editorial
- operational
- document-first
- dense but readable
- professional
- restrained
- technical-user-friendly

The product should not feel like:

- a SaaS dashboard
- an AI assistant workspace
- a tutorial system
- a productivity coach
- a marketing-led product shell

## Locked Workspace Architecture

The MVP workspace should remain:

- left structured editor
- right live preview
- continuous stacked section flow
- no selector/detail split
- sections expand and collapse in place
- active role expanded
- inactive roles collapsed but readable
- plus/minus disclosure language for section state

This is the core workspace model.

Do not replace it with:

- manuscript mode
- full inline document editing
- annotation-first document workflows
- separate section pickers
- tabbed section navigation
- dashboard-style panels

## Editable Surface Language

Editable surfaces should feel document-aware and structured, not like generic form fields.

Target surface treatment:

- restrained soft radius, roughly 5 to 6px
- visible editability
- low-contrast surfaces
- calm focus states
- enough framing to feel editable
- not enough framing to feel boxy or consumer-form-like

Avoid:

- giant form boxes
- bubbly SaaS softness
- invisible editability
- hard enterprise form chrome
- textarea-heavy surfaces
- markdown-editor styling

### Surface Behavior

- Active fields should be clearly writable.
- Empty fields should still look intentional.
- Hover and focus states should be restrained.
- Nested surfaces should read as part of one document system, not separate cards.

## Active Editing Behavior

The active role should receive subtle emphasis, not a hard mode switch.

### Required behavior

- active role expands and becomes slightly more prominent
- inactive roles remain visible in collapsed form
- controls quiet down during typing
- surrounding context stays available
- structural orientation is preserved at all times

### Not allowed for MVP

- hard immersive editing mode
- full workspace recentering while typing
- disappearing document context
- aggressive focus-only UI collapse

The MVP should support calm, long editing sessions.

## Control Language

The control system should be small, structural, and quiet.

### Section disclosure

- use plus/minus disclosure indicators
- avoid chevrons that read like UI-kit defaults
- avoid outlined icon buttons for core section toggles

### Secondary actions

- reduce visible action noise
- prefer hover or contextual actions
- keep destructive actions quiet unless they are actively needed
- avoid loud CRUD-style action labels as the default visible state

### Reorder controls

Reorder behavior should feel like moving document structure, not sorting a demo list.

See the reorder section below.

## Guidance Philosophy

Guidance for the MVP should be lightweight structural awareness only.

Guidance should communicate document state with compressed shorthand, such as:

- Page 2
- Near break
- Long bullet
- Dense role
- Crowded
- Readable
- Heavy section

### Guidance tone

Guidance should feel like editorial markup or system state.

It should not feel like:

- prose coaching
- AI feedback
- writing assistance
- resume optimization scoring
- motivational commentary

### Guidance scope for MVP

Guidance should remain simple and legible.

Advanced intelligence is deferred to later phases.

## Reorder Behavior

The MVP should support reorder behavior that stays visually restrained.

### Required behavior

- whole-row draggable movement
- subtle hover affordance
- insertion line during drag
- no permanent visible drag handles

### Interaction intent

Reordering should feel like structural movement within the resume, not object manipulation in a design tool.

### Deferred

- advanced drag systems
- multi-axis rearrangement
- complex keyboard reordering UI
- rich drag affordance chrome

## Toolbar Philosophy

The top toolbar should be restrained and functional.

### Required

- minimal controls
- export prioritized
- density or page state visible, but quiet

### Avoid

- giant productivity ribbons
- command-center style toolbars
- dense icon clouds
- visible feature sprawl

The toolbar should support the document, not compete with it.

## Preview Philosophy

The live preview should always remain visible.

### Required

- the document remains the primary artifact
- preview updates live
- editor and preview stay visually connected

### MVP behavior

- clicking preview may jump focus to the corresponding editor area later
- aggressive scroll sync is deferred for MVP

The preview should inform editing, not replace it.

## Motion Philosophy

Motion should remain subtle and structural.

### Required

- restrained timing
- small transitions only
- state changes should clarify structure

### Avoid

- decorative animation
- delight-first motion
- bounce, flourish, or flourish-like easing
- motion that competes with typing or reading

Motion should help the workspace feel calm and legible.

## What Is Intentionally Deferred

The following are intentionally deferred beyond the MVP:

- advanced AI guidance
- coaching-style resume suggestions
- resume scoring
- keyword optimization dashboards
- intelligent rewrite systems
- deep page-break automation
- advanced reorder helpers
- keyboard-first power workflows beyond basic support
- preview-to-editor jump logic beyond simple focus handoff
- multi-user collaboration
- manuscript-style editing modes
- alternative workspace paradigms

## What Should Not Be Redesigned Accidentally

These parts of the product should remain stable while implementing the MVP:

- left editor / right preview architecture
- continuous section stack
- collapsed and expanded section behavior
- restrained soft-radius field language
- plus/minus disclosure language
- subtle active editing emphasis
- reduced visible action noise
- editorial style guidance
- document-first orientation

## MVP Implementation Priorities

If the goal is to make the product usable quickly, implement in this order:

1. keep the current left editor / right preview architecture stable
2. make section expand/collapse and active role editing feel reliable
3. apply the restrained soft-radius editable surface language
4. keep controls quiet and structurally consistent
5. add lightweight guidance labels for density, overflow, and scanability
6. implement whole-row drag reorder behavior with subtle feedback
7. keep preview live and stable throughout editing

8. add small motion only where it clarifies state changes

## AR-C Reorder Amendment

The later AR-C decision supersedes the exploratory handle guidance above:

- Resume sections, Projects, Project bullets, and Experience bullets use a permanently visible, restrained three-line reorder handle.
- Reordering uses an application-controlled Pointer Events interaction rather than native HTML drag-and-drop.
- Full keyboard reorder mode remains deferred; existing accessible fallback controls must remain available without adding visible Move up/down chrome.

## Remaining Unresolved, But Non-Blocking, Questions

These questions are still open, but they do not block MVP implementation:

- exact thresholds for when guidance appears
- exact wording for density and overflow states
- how strong the active role emphasis should be in edge cases
- whether preview clicks should jump to the exact source field or to the nearest section
- whether keyboard reorder support should be first-class in MVP or added shortly after
- whether section-level guidance should appear inline, in a status line, or both
- whether future phases should add richer analysis or keep the MVP guidance model minimal

## Summary

Resume Studio Phase C should ship as a calm, editorial, document-first resume authoring tool.

The MVP should preserve the familiar structured editor / live preview architecture, keep editable surfaces restrained but obvious, and communicate guidance as compressed document state rather than AI coaching.

The implementation target is not novelty. The target is a serious, calm, production-quality resume workspace that users can work in for a long time without friction.
