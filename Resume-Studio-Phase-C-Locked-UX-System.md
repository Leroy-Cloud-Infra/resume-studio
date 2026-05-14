# Resume Studio Phase C Locked UX System

## Status

This document is the authoritative Phase C UX and product-behavior reference for Resume Studio before implementation begins.

It consolidates the locked outcomes of the Design Lab process into implementation language.

Its purpose is not exploration, ideation, or redesign. Its purpose is drift prevention.

Use this document to guide:

- future Codex implementation threads
- future build threads
- future contributors
- UX consistency reviews
- interaction and copy decisions during MVP execution

This document locks product behavior and interaction philosophy for Phase C.

It should be read alongside the project ADRs and technical specification, but it is the primary source of truth for workspace behavior, interface tone, and editor interaction rules.

## 1. Product Identity

Resume Studio is document software for tailoring resumes through structured editing and controlled rendering.

It is not a generic profile builder and not a writing coach.

It is a focused production environment for turning structured resume content into a reliable, exportable document.

The product identity is defined by these locked priorities:

- document-first over app-first
- structure over decoration
- restraint over performance
- operational calm over SaaS friendliness
- software confidence over onboarding
- continuous editing flow over segmented workflows
- local density with global breathing
- visible structure without loud chrome

Resume Studio should feel like serious software that happens to be quiet, not like a friendly product shell trying to explain itself.

## 2. Product Tone

The tone is calm, precise, restrained, and confident.

The interface should communicate like an editorial or production tool:

- brief
- direct
- low-drama
- state-based
- structurally aware

Preferred tone characteristics:

- shorthand over explanatory prose
- observational over persuasive
- specific over motivational
- quiet over celebratory
- trustworthy over friendly

The product should never sound like:

- a coach
- a tutor
- a growth product
- a productivity dashboard
- an AI assistant narrating the user’s work

## 3. Anti-Goals / What Resume Studio Is NOT

Resume Studio is not:

- a new mockup playground
- a freeform page design canvas
- a dashboard-style productivity app
- an AI-first resume generator
- a template marketplace experience
- a guided onboarding funnel
- a manuscript annotation tool
- a selector/detail enterprise CRUD shell
- a writing score or optimization product

Resume Studio should not drift toward:

- “AI trying to help” energy
- fake sophistication through metrics, scores, or system theater
- cheerful product-marketing language
- feature visibility for its own sake
- layout chrome that competes with the document

## 4. Workspace Architecture

The locked workspace model is:

- left structured editor
- right live preview
- continuous vertical section stack in the editor
- in-place section expansion and collapse
- no selector/detail split
- no tabbed section navigation
- no separate section picker panel
- no dashboard panel architecture

This model is locked because it preserves orientation and editing momentum.

The user should always be able to see:

- where they are in the editor
- what section is active
- how the document is rendering
- how surrounding content is affected

Continuous editing flow won over selector/detail architecture because selector/detail introduces unnecessary mode switching, forces attention jumps, hides surrounding structure, and turns resume work into record management instead of document editing.

The editor must feel like one working surface, not a collection of disconnected settings views.

## 5. Editor Philosophy

The editor is a structured document workspace, not a form farm.

Its job is to make content editable without flattening the resume into generic input boxes.

Locked editor principles:

- the user edits content
- the system protects structure
- the template controls presentation
- the document remains legible while editing
- context stays visible during long sessions
- the interface recedes when not needed

The editor should reward repeated use through predictability, not through novelty.

It should feel durable, serious, and comfortable for dense resume editing.

## 6. Editable Surface Language

Editable surfaces must read as document-aware and structured.

The locked surface direction is restrained soft radius with clear affordance and low visual noise.

Surface rules:

- subtle radius only
- visible but quiet borders
- calm focus states
- empty fields remain intentional
- active fields feel writable without looking promotional
- nested surfaces should read as one system

Avoid:

- giant boxed textareas
- bubbly consumer SaaS softness
- invisible inline affordances that hide editability
- hard enterprise form chrome
- heavy card stacks
- markdown editor styling

The purpose of the surface language is clarity, not personality.

## 7. Active Editing Behavior

The active section or role should gain emphasis, but the system must not hard-switch into immersion mode.

Locked active behavior:

- the active role expands in place
- inactive roles collapse but remain readable
- the active area gains slight visual elevation
- surrounding structure stays visible
- controls quiet down while typing
- preview remains present and connected

Disallowed for MVP:

- aggressive recentering
- hard focus traps
- disappearing context
- full-screen editing modes
- dramatic chrome collapse

The product must support long editing sessions without making the user repeatedly re-orient.

## 8. Spacing & Rhythm System

The spacing system is intentionally balanced rather than maximal.

The locked rhythm principle is local density with global breathing.

That means:

- rows and field groups can be tight where work happens
- sections need enough outer breathing room to preserve scanning
- active clusters can densify without turning the whole editor heavy
- separators should clarify structure, not decorate it

The editor should feel compact where the user is typing and open enough everywhere else to preserve calm.

Avoid these spacing failures:

- uniform looseness that wastes attention
- wall-to-wall compression with no pacing
- decorative whitespace detached from function
- excessive cards, padding, or inset containers that make the tool feel consumerized

## 9. Toolbar Philosophy

The toolbar is a quiet utility band, not the center of the product.

Locked toolbar behaviors:

- keep it restrained
- keep it grouped
- prioritize export
- show a small amount of document state
- keep feature count visually contained

Distributed toolbar ownership is preferred.

That means the toolbar should be organized into three calm responsibilities:

- document identity and save/page state
- current template and density context
- reversible actions and export

This was preferred over a single command-center toolbar because distributed ownership prevents one loud control cluster from dominating the workspace, reduces the feeling of feature sprawl, and keeps the document as the primary artifact.

Avoid:

- ribbons
- dense icon clouds
- dashboard headers
- command-center language
- productivity-app “control hub” behavior

## 10. Preview Pane Philosophy

The preview is always visible and always important.

It is not decorative and not optional.

Locked preview rules:

- preview stays live during editing
- preview remains visually connected to the editor
- preview reflects the same rendering system used for export
- preview exists to inform editing decisions early

Document realism is intentionally restrained.

The preview should feel like a real document stack, but not like a staged fake desk or skeuomorphic page theater.

Document realism was restrained because too little realism weakens trust in export outcome, while too much realism adds visual ceremony, consumes attention, and makes the product feel performative rather than operational.

The preferred result is believable page structure with quiet framing.

## 11. Empty State Philosophy

Empty states should make the first edit obvious without becoming onboarding.

Locked empty-state principles:

- preserve the real workspace even when content is missing
- keep one obvious entry point active
- use small structural callouts only where they reduce uncertainty
- keep the preview page visible even when sparse

Empty states should not become:

- tours
- large instructional modules
- cheerleading copy
- stacked coaching prompts

Guidance is allowed only where it directly clarifies the next structural action.

The interface should trust the user to begin once the structure is visible.

## 12. Guidance Philosophy

Guidance is intentionally minimized for MVP.

It should communicate document state, not attempt to improve the user.

Locked guidance principles:

- shorthand over prose
- structural signals over coaching
- editorial or system tone over assistant tone
- quiet visibility over persistent warning surfaces
- appear only when useful

Examples of acceptable guidance language:

- Page 2
- Long bullet
- Dense role
- Near break
- Overflow risk
- Readable
- Crowded

Guidance was intentionally minimized because the MVP is validating editing and rendering reliability first. Rich guidance introduces interpretation, opinion, trust problems, and visual noise before the core document workflow is stable.

Common SaaS guidance patterns were rejected because they turn the editor into a warning dashboard, over-explain basic states, and create “AI trying to help” energy even when no intelligence is actually being applied.

## 13. Control Language

Control language must be compact, structural, and quiet.

Locked control behavior:

- disclosure markers should be small and plain
- reorder affordance should be subtle
- visible actions should be reduced
- destructive actions should not dominate resting state
- hover and focus can reveal controls, but should not create spectacle

For section state, the locked language is plus/minus disclosure.

This is locked even though earlier studies explored restrained chevrons.

Plus/minus is the Phase C decision because it is more compact, more direct, easier to parse in dense stacks, and better aligned with the document-software tone being locked now.

Reorder behavior should use whole-row drag interaction with subtle feedback and no permanent loud handles.

Avoid:

- outlined icon buttons everywhere
- visible CRUD labels on every row
- drag handles that turn the editor into a sortable list demo
- default UI-kit disclosure styling

## 14. Motion Philosophy

Motion should clarify structure and then disappear.

Locked motion principles:

- small transitions only
- restrained timing
- no decorative flourish
- no bounce
- no delight-first motion
- no motion that competes with typing or reading

Motion may be used for:

- section open and close
- active state elevation
- subtle drag insertion feedback
- preview updates that need visual continuity

Motion should make the workspace feel calm and legible, not lively.

## 15. Interaction Principles

The following interaction principles are locked for implementation:

- the user should always know what section is active
- the user should never lose sight of document structure
- the interface should preserve editing flow
- every visible control must earn its presence
- the preview should stay informative, not theatrical
- the system should not narrate obvious actions
- the product should assume competence
- editing should feel continuous, not segmented

Interfaces that trust the user instead of narrating themselves are a core Phase C requirement.

## 16. UX Themes Observed Across Design Decisions

The Design Lab repeatedly converged on the same themes.

These themes are now locked:

- restraint over performance
- structure over decoration
- operational calm over SaaS friendliness
- shorthand over explanatory prose
- document-first over app-first
- software confidence over onboarding
- continuous editing flow over segmented workflows
- local density plus global breathing
- visible structure without loud chrome
- avoiding “AI trying to help” energy
- avoiding fake sophistication
- avoiding dashboard and productivity-app language
- trusting the user instead of narrating the interface

If a future implementation idea conflicts with these themes, the burden is on that idea to justify itself.

## 17. Recurring Anti-Patterns to Avoid

The following anti-patterns appeared repeatedly during exploration and are explicitly rejected:

- selector/detail workspace architecture
- permanent side panels for guidance
- command-center toolbars
- dashboard metrics and scoring
- fake AI confidence surfaces
- tutorialized empty states
- over-rounded SaaS surface language
- heavy card stacking
- loud action menus in resting state
- excessive document skeuomorphism
- segmented workflow steps
- “smart” language that explains what the user already sees

Why common SaaS patterns were rejected:

- they over-prioritize feature visibility instead of editing flow
- they frame the product as a service shell instead of document software
- they create friendliness at the expense of seriousness
- they make every action feel supervised
- they tend to add chrome, labels, and narration faster than they add real capability

## 18. MVP vs Deferred Features

Locked for MVP:

- left editor and right live preview
- continuous stacked editor flow
- in-place section expand and collapse
- active role emphasis with collapsed surrounding roles
- restrained editable surfaces
- quiet toolbar with export priority
- live preview fidelity tied to the shared rendering system
- lightweight guidance signals
- subtle reorder behavior
- small structural motion

Deferred beyond MVP:

- AI coaching
- summary rewriting
- bullet generation
- resume scoring
- keyword optimization dashboards
- deep page-break automation
- rich preview-to-editor navigation
- advanced keyboard power workflows
- multi-user collaboration
- alternative workspace paradigms
- full manuscript annotation mode
- freeform document editing

Templates were deprioritized in Phase C because the workspace model, editing behavior, and rendering trust model matter more than expanding template choice before the core system is stable.

Controlled templates remain part of the product architecture, but template breadth is not the UX priority for implementation.

## 19. Future AI/Intelligence Layer Boundaries

Future intelligence features must remain outside the core editing loop unless they can operate without changing the product’s calm, document-first character.

Locked boundaries:

- AI must remain optional
- AI must not become the product’s primary voice
- AI must not replace structural editing
- AI must not turn the workspace into a suggestion dashboard
- AI must not create mandatory cloud dependence

If future intelligence appears, it should behave like an optional secondary layer that respects the existing editing flow.

It must not redefine Resume Studio as an assistant product.

## 20. Implementation Priorities

Implementation should proceed in this order:

1. preserve the locked left-editor and right-preview workspace architecture
2. make section stacking, expand/collapse, and active-role behavior reliable
3. implement restrained editable surface language across fields and bullets
4. reduce visible control noise and establish the locked control language
5. keep preview rendering live, stable, and visibly connected to the editor
6. implement balanced spacing and rhythm rather than adding more features
7. add lightweight guidance signals using locked shorthand language
8. add subtle whole-row reorder behavior with restrained feedback
9. apply small structural motion only where it clarifies state
10. defer anything that introduces assistant energy, dashboard behavior, or workspace fragmentation

The guiding rule is simple: stabilize the serious document workspace before adding intelligence, breadth, or polish theater.

## 21. Remaining Non-Blocking Open Questions

These questions remain open, but none justify re-opening the locked system:

- exact thresholds for density, long-bullet, and overflow guidance
- whether guidance should appear only inline, only in a status line, or in a limited hybrid
- how strong active-role emphasis should be at extreme densities
- whether preview click-to-focus should target the exact field or the nearest section first
- the exact keyboard support level for reorder behavior in MVP
- the final wording set for shorthand guidance states
- the exact amount of preview page realism that best preserves trust without adding visual ceremony
- the final grouping details of toolbar items as implementation constraints sharpen

These are tuning questions, not architectural questions.

## Locked Summary

Resume Studio Phase C is locked as a calm, document-first, structurally opinionated resume editing system.

Its defining characteristics are:

- serious software behavior
- continuous editing flow
- visible but quiet structure
- restrained guidance
- reliable live preview
- controlled rendering
- minimal narration

Implementation should protect these decisions aggressively.

The goal is not to make the interface feel more helpful.

The goal is to make it feel more trustworthy.
