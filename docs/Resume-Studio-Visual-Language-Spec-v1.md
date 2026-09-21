# Resume Studio Visual Language Spec v1

## Status

This document is the authoritative visual language constraint for Resume Studio Phase C implementation.

It is not a generic design-system document.

It defines the product-specific visual philosophy, implementation boundaries, and anti-patterns that should govern future UI work.

Use this document alongside [Resume-Studio-Phase-C-Locked-UX-System.md](../Resume-Studio-Phase-C-Locked-UX-System.md).

If a future implementation choice conflicts with this document, the implementation should change before the visual language does.

## 1. Product Emotional Identity

Resume Studio should feel like:

- an editorial workstation
- a structured authoring tool
- document and layout software
- a publishing environment
- an operational editing utility

Resume Studio should not feel like:

- an AI SaaS product
- a startup dashboard
- an onboarding-heavy productivity app
- a no-code builder
- a component-library demo
- a Tailwind or shadcn admin shell

The psychological tone should be:

- calm
- competent
- restrained
- precise
- durable
- quietly serious

The product should create the sense that the user is inside reliable document software, not inside an app that is trying to impress, coach, or entertain them.

Editing philosophy:

- the user is here to work, not to be guided through a journey
- the interface should support sustained attention
- the interface should trust that the user understands why they are editing a resume
- the system should feel structured without feeling managerial

Relationship between editor and document:

- the editor is the instrument
- the document is the artifact
- the preview is not decorative confirmation
- the shell exists to support document production, not to become the main visual subject

## 2. Surface Philosophy

Resume Studio should prefer continuous surfaces over stacked cards.

The editor should read as one working plane with structural divisions, not as a pile of independent white boxes.

Surface rules:

- favor continuous panels over nested card stacks
- use subtle radius only
- use borders as structural separators, not decoration
- use elevation sparingly and only where active context needs slight emphasis
- keep surfaces visually anchored to the workspace
- keep shell integration quiet and planar
- treat panels as parts of one workstation, not floating modules

Radius philosophy:

- radii should be soft but restrained
- corners should feel engineered, not playful
- avoid large rounded rectangles that suggest consumer SaaS softness

Border philosophy:

- borders should be visible enough to preserve orientation
- borders should separate layers and regions cleanly
- borders should not become a texture pattern

Elevation philosophy:

- most surfaces should feel grounded
- elevation should be rare, low, and functional
- active emphasis should come from structure first, not shadow spectacle

Workspace anchoring:

- the shell should feel placed into a stable workspace field
- panels should not look like disconnected floating cards on a decorative background

Panel behavior:

- the editor and preview should feel like adjacent tools within one environment
- panel boundaries should clarify responsibility, not compete for attention

Why floating SaaS shells are rejected:

- they make the product feel generic
- they emphasize app chrome over document work
- they introduce unnecessary friendliness and softness
- they visually separate tools that should feel operationally connected

## 3. Control Philosophy

Controls should feel like software instruments, not promotional call-to-actions.

Button rules:

- default buttons should be quiet and compact
- primary actions should be restrained rather than loud
- button hierarchy should be clear without relying on bright color
- controls should feel integrated into the workspace, not pasted on top of it

Disclosure controls:

- use explicit plus and minus language for section disclosure
- disclosure should feel structural, not decorative
- disclosure markers should be simple, readable, and low-drama

Action placement:

- actions belong near the region they affect
- top-level document actions belong to the shell toolbar
- local editing actions belong inside the active editing region
- avoid dumping all actions into one giant control zone

Toolbar ownership:

- left side owns document identity
- middle or quiet utility area may own minimal page state if it remains clean
- right side owns export and document-level actions
- the toolbar should feel distributed, not centralized

Destructive actions:

- destructive actions should be available but visually quieter than primary editing actions
- danger should be communicated through clarity, not theatrical red emphasis
- destructive controls should not dominate resting surfaces

Why typical SaaS controls are rejected:

- chevrons imply generic accordion UI rather than document structure
- pills and chips create dashboard language
- colorful badges add status theater
- large primary buttons create startup-product energy
- icon-heavy command bars read like feature marketing

Avoid:

- chevrons
- pills
- dashboard chips
- colorful badges
- ribbon-like action bars
- component-library accordion styling
- segmented-control theatrics

## 4. Input Philosophy

Fields should feel like document instruments, not generic forms.

Input rules:

- inputs should read as editable surfaces inside a structured writing environment
- fields should be calm, legible, and durable under repetition
- editing should feel direct, not ceremonious

Label behavior:

- labels should be brief and functional
- labels should describe the field, not teach the concept
- label hierarchy should remain secondary to section structure

Textarea behavior:

- textareas should feel like purposeful writing surfaces
- they should not become oversized message boxes
- their height should reflect task scope without dominating the section

Focus behavior:

- focus should be visible and calm
- focus should improve orientation, not create performance
- avoid glowing rings, neon emphasis, or heavily branded focus treatments

Spacing density:

- inputs should be locally dense enough for efficient editing
- field spacing should support scanning without creating form sprawl
- dense areas are acceptable when tied to real work

Editable surface philosophy:

- fields should remain clearly editable even when visually restrained
- editable surfaces should belong to the same material family as the surrounding editor
- nested fields should not feel like separate products inside the same screen

Anti-patterns to avoid:

- oversized rounded inputs
- flashy focus rings
- giant labels with helper essays
- message-box textareas
- stacked card forms inside card forms
- consumer-app softness
- sterile enterprise form chrome

## 5. Typography Philosophy

Typography should follow document-oriented rhythm rather than conventional app-marketing rhythm.

Hierarchy strategy:

- section structure should be the primary typographic hierarchy
- field labels should be subordinate
- metadata should be smaller and quieter
- document content should remain more important than interface narration

Document-oriented rhythm:

- use typography to support scanning and sequence
- favor concise uppercase or restrained structural labels where useful
- keep reading rhythm tight and stable

Editorial versus UI typography:

- the interface should borrow discipline from editorial tools
- it should avoid the over-labeled, over-explained quality of UI kits
- text should feel purposeful, not generated from component defaults

Metadata treatment:

- metadata should be compact
- metadata should never behave like badges or decorative chips
- metadata should sit quietly in the hierarchy

Why excessive labels and helper copy are rejected:

- they slow experienced users down
- they make the interface narrate itself
- they create onboarding energy instead of operational calm
- they crowd out the actual resume content

## 6. Guidance Philosophy

Guidance should be observational, not instructional.

Guidance rules:

- describe state
- indicate structure
- surface pressure points
- avoid telling the user how to feel
- avoid speaking like a coach or assistant

Guidance should be:

- structural
- brief
- neutral
- conditional
- quiet

Guidance should not be:

- conversational
- motivational
- coaching-oriented
- productivity flavored
- anthropomorphic

No AI assistant tone:

- do not say the system is helping
- do not narrate intent
- do not suggest intelligence theater
- do not use conversational reassurance as default interface copy

Guidance hierarchy:

1. critical structural state
2. page-fit or density state
3. local editing hints only when necessary

Acceptable MVP guidance examples:

- `1 Page`
- `Near limit`
- `Content continues past page 1`
- `Dense`
- `Very dense`
- `4 bullets`
- `Avg 128 chars`

Rejected guidance examples:

- `Looks great`
- `You’re on track`
- `Try making this more impactful`
- `AI suggests tightening this section`
- `This section could be stronger`
- `Let’s improve readability`

## 7. Color Philosophy

Resume Studio should use cooler restrained neutrals.

Color rules:

- neutral structure should dominate
- accents should be rare and purposeful
- color should support state recognition without becoming identity theater
- the document should remain the visual anchor

Reduced startup warmth:

- avoid warm optimistic palettes that make the product feel lifestyle-oriented
- avoid soft peach, candy blue, or productized purple as default personality signals

Restrained accents only:

- accent use should be sparse
- any accent should feel structural or state-driven, not branded for friendliness

Document as anchor:

- the previewed document should visually hold more authority than the shell chrome
- the shell should frame the artifact, not outshine it

Avoid friendly SaaS palette language:

- bright call-to-action blues
- cheerful greens used as product mood
- rainbow state systems
- multi-accent dashboards

## 8. Motion Philosophy

Motion should be structural only.

Motion rules:

- motion should help preserve orientation
- motion should explain continuity when sections open or close
- motion should never become a personality layer

Continuity over delight:

- prefer subtle transitions that confirm state change
- avoid bounce, springiness, flourish, and reward mechanics

Operational calm:

- movement should be quiet
- timing should be short and controlled
- motion should support editing flow instead of decorating it

Anti-patterns:

- cute microinteractions
- celebratory motion
- hover theatrics
- delayed transitions that make the tool feel slow
- novelty animations that shift attention away from content

## 9. Spacing and Rhythm Philosophy

Resume Studio follows local density with global breathing.

That means:

- active work areas can be compact
- section-to-section spacing should preserve orientation
- the overall shell should breathe even when the local editing surface is dense

Asymmetric operational rhythm:

- not every region should carry identical padding
- rhythm should reflect task importance and scanning needs
- compact stacks are acceptable when they improve editing efficiency

Avoid evenly padded SaaS spacing:

- uniform spacing reads like a template
- equal padding everywhere weakens hierarchy
- over-loose rhythm makes the tool feel like a settings panel

Section hierarchy rhythm:

- section headers should introduce clear cadence
- expanded content should tighten relative to section boundaries
- compact collapsed rows should preserve scanability

Workspace density philosophy:

- density is allowed where work is repetitive
- breathing is required where structure must remain legible
- the tool should feel efficient, not cramped

## 10. Preview Philosophy

The document is the primary artifact.

Preview rules:

- the preview is not a widget
- the preview is not a decorative side panel
- the preview should feel like a credible page artifact
- the preview should remain visually stable during editing

Page-stack philosophy:

- the preview should resemble a restrained page stack
- page framing should communicate realism without becoming a scene
- the document should feel prepared for export, not staged for spectacle

Shell restraint:

- preview chrome should stay quiet
- page framing should be believable but understated
- the shell around the preview should not compete with the page

Realistic but restrained page presentation:

- enough realism to support trust in output
- not enough realism to become skeuomorphic theater
- the user should read the page, not admire the app

## 11. Anti-Pattern Catalog

The following patterns are explicitly rejected for Resume Studio:

- pills
- colorful status badges
- floating dashboard cards
- onboarding prose
- giant helper copy
- decorative gradients
- oversized radii
- cute microinteractions
- Tailwind or shadcn visual fingerprints
- AI assistant UI patterns
- startup SaaS warmth
- generic admin-panel spacing
- component-library accordion language
- collapsible sidebar conventions
- command-center dashboards
- hero headers
- motivational empty states
- oversized primary buttons
- glowing focus treatments
- stacked nested cards
- KPI-style chips
- celebratory success states
- illustrated onboarding panels
- persuasive call-to-action language
- faux intelligence indicators
- colorful density scores
- gamified progress signals
- feature-discovery banners

If a proposed UI element immediately reads as common modern SaaS furniture, it should be treated as suspect by default.

## 12. Reference Philosophy

Resume Studio should resemble the type of software associated with:

- editorial software
- workstation software
- publishing and layout software
- inspector-based professional tools
- structured document tooling

This does not mean copying any specific product.

The target is category behavior, not visual imitation.

Useful reference qualities:

- disciplined hierarchy
- quiet confidence
- operational clarity
- dense but readable information handling
- minimal emotional performance

Unhelpful reference qualities:

- consumer productivity playfulness
- startup-brand friendliness
- component-library sameness
- highly animated creative-tool spectacle

## 13. Implementation Guardrails

Future Codex implementation work should evaluate decisions using these questions:

- does this feel like professional document software?
- does this feel like a structured authoring environment?
- does this feel framework-generated?
- does this look like generic SaaS furniture?
- does this visually narrate itself too much?
- is the shell competing with the document?
- is this control louder than its actual importance?
- is this guidance observational or instructional?
- does this increase calm or add product theater?
- does this preserve continuous editing flow?

Guardrail rules:

- prefer subtraction before addition
- prefer structure before decoration
- prefer continuity before novelty
- prefer neutral confidence before friendliness
- prefer quiet utility before feature signaling

When uncertain:

1. remove decorative energy first
2. reduce explanatory copy second
3. simplify visual hierarchy third
4. check whether the result still feels like document software

Implementation should fail closed rather than open.

If a future UI choice feels ambiguous, the safer direction is the more restrained and more document-oriented one.

## Closing Principle

Resume Studio should look like serious document software adapted to the web, not like a web app pretending to be serious software.

The standard is not whether the interface looks polished in isolation.

The standard is whether it supports concentrated resume editing without drifting into generic SaaS behavior, artificial friendliness, or visual self-narration.
