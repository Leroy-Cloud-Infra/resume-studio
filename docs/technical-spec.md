# Technical Spec: Resume Studio

## Overview

Resume Studio is a local first, self hosted web application for editing structured resume content, rendering that content through controlled templates, and exporting polished PDFs.

The MVP prioritizes:
- privacy
- local ownership
- structured editing
- formatting consistency
- reliable PDF export
- simple self hosting

The application is intentionally designed around controlled templates rather than unrestricted document editing.

---

## Technical Goals

- provide a local first web application
- store resume data locally
- render resumes from structured data
- maintain formatting consistency across edits
- support live resume preview
- support reliable PDF export
- remain lightweight and self host friendly
- avoid unnecessary infrastructure complexity

---

## MVP User Model

The MVP is designed primarily for single user, self hosted usage.

The initial architecture assumes:
- a trusted local environment
- one primary user
- local ownership of data
- no public multi tenant hosting

Future releases may revisit authentication and multi user support if needed.

---

## Recommended MVP Stack

### Frontend

- Next.js
- React
- TypeScript

### Styling

- CSS Modules or plain CSS
- template specific print styling
- minimal UI dependency usage for MVP

### Backend

- Next.js API routes

The MVP should avoid splitting the application into separate frontend and backend services.

### Database

- SQLite

SQLite is preferred for:
- simplicity
- portability
- local first workflows
- lightweight self hosting

### ORM

- Prisma

### PDF Export

- Puppeteer
- HTML/CSS print rendering

### Deployment

- Docker Compose

---

## Architecture Summary

Resume Studio will use a single application architecture for the MVP.

The application will contain:
- resume editor UI
- resume preview renderer
- template rendering system
- local persistence layer
- PDF export pipeline
- API routes
- local database

The MVP should prioritize simplicity and maintainability over scalability.

---

## Resume Data Architecture

Resume data should remain structured and schema driven rather than fully arbitrary rich text.

Each resume should contain:
- id
- title
- template id
- created at
- updated at
- structured sections

Supported sections may include:
- header/contact information
- summary
- skills
- experience
- projects
- education
- certifications

Section content should remain predictable and structured to support reliable rendering and export behavior.

---

## Template System

Templates should be implemented as reusable rendering components that receive structured resume data as input.

Templates are responsible for:
- layout
- typography
- spacing
- alignment
- section presentation
- print formatting
- export consistency

Templates should avoid directly mutating resume content and should remain presentation focused.

The system should support configurable section ordering while preserving template formatting constraints.

---

## Template Constraints

Templates should:
- remain ATS friendly
- support standard US letter page sizing
- minimize layout instability
- preserve consistency between preview and export
- prioritize readability over excessive visual complexity

Templates are intentionally controlled and opinionated.

The MVP should avoid:
- drag and drop layout editing
- arbitrary visual positioning
- unrestricted template customization

---

## Rendering Strategy

Resume rendering should use HTML and CSS as the primary rendering engine.

The live preview and exported PDF should share the same rendering components whenever possible.

This approach reduces:
- formatting drift
- duplicate rendering logic
- export inconsistencies

---

## PDF Export Strategy

PDF export should render the selected template using HTML/CSS and generate the final document through Puppeteer.

The export system should prioritize:
- consistent typography
- stable margins
- reliable pagination
- predictable print output
- ATS readability

PDF export is the only planned export format for the MVP.

DOCX export is intentionally outside the MVP scope.

---

## Local Hosting Strategy

The MVP should run fully through Docker Compose.

The application should:
- support local self hosting
- avoid mandatory cloud services
- store data locally
- remain functional without internet access

The MVP deployment should remain simple enough for self hosted and homelab environments.

---

## Data Portability

Resume data should remain portable and exportable where possible.

Structured resume data should avoid tight coupling to a single template implementation.

Future import/export improvements may build on this architecture.

---

## AI Integration

AI features are intentionally outside the MVP.

Future AI integrations may support:
- local LLM providers
- external AI providers
- bullet refinement
- summary rewriting
- keyword analysis
- job posting comparison

AI features should remain optional.

The core application must remain fully functional without AI integrations.

---

## Security and Privacy

Resume Studio is designed around a local first privacy model.

The MVP should:
- avoid mandatory cloud dependencies
- avoid sending resume content to third party services
- keep resume data locally controlled
- support optional future integrations without requiring them

---

## Out of Scope for MVP

The MVP intentionally excludes:
- DOCX export
- billing systems
- hosted SaaS infrastructure
- public resume sharing
- drag and drop page builders
- collaborative editing
- AI generated writing
- advanced permission systems
- multi tenant architecture

---

## Build Phases

Detailed implementation phases are tracked in:
`docs/roadmap.md`

---

## Phase 1 Build Target

Phase 1 exists to validate the core rendering and editing architecture.

Phase 1 should support:
- creating a resume
- editing structured resume sections
- rendering one controlled template
- live preview functionality
- PDF export

Phase 1 is complete when a user can generate a polished, usable PDF resume from structured content using the local application.