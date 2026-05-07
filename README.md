# Resume Studio

Resume Studio is an open source, self hosted resume editing and formatting tool designed for creating tailored resumes from structured templates.

The goal is to make resume tailoring faster without fighting document formatting while keeping user data local, private, and fully owned by the user.

Users can choose a template, edit resume sections such as summary, skills, experience, projects, and education, preview the result in real time, and export polished PDFs with consistent formatting.

---

## Why this exists

Most resume builders:
- lock useful features behind subscriptions
- rely heavily on cloud services
- store personal resume data remotely
- focus more on AI generated writing than editing workflows
- make formatting fragile and frustrating

Resume Studio focuses on:
- structured editing
- consistent formatting
- local ownership
- self hosting
- privacy
- open source accessibility

The app is designed to work well alongside the user's preferred writing workflow, including manual editing, AI assistance, or local LLM tools.

---

## Core Principles

- Local first
- Privacy focused
- Open source
- Self hostable
- Template driven
- AI optional, not required
- Structured editing over document chaos

---

## Design Philosophy

Resume Studio prioritizes clarity, consistency, and editing speed over excessive customization.

The application should feel lightweight, predictable, and distraction free while still producing polished, professional resumes.

---

## Template Philosophy

Templates are controlled presentation layers that enforce formatting consistency.

Users edit structured content while templates manage:
- typography
- spacing
- alignment
- section hierarchy
- print layout
- page formatting

Templates are intentionally opinionated to reduce formatting instability.

---

## MVP Goals

- Create and edit resumes
- Choose from controlled resume templates
- Edit common resume sections
- Add, remove, reorder, and edit bullet points
- Preview the resume in real time
- Export to PDF
- Keep formatting consistent across edits

---

## Not in MVP

- AI generated writing
- Billing or subscriptions
- DOCX export
- Drag and drop visual editing
- Multi user collaboration
- Public sharing links

---

## Core Workflow

1. Create a new resume
2. Choose a template
3. Edit sections and bullet points
4. Preview formatting
5. Adjust content as needed
6. Export PDF

---

## Privacy

Resume Studio is designed with a local first mindset.

Users should be able to:
- host the application themselves
- retain ownership of their data
- use the application without cloud dependencies
- optionally integrate AI providers without requiring them

---

## Future Considerations

Future releases may include optional integrations with local or external LLM providers for workflows such as:
- bullet refinement
- keyword optimization
- resume tailoring assistance
- summary rewriting
- job posting analysis

AI features are intentionally optional and are not required for core functionality.

---

## Planned Tech Stack

- Frontend: React or Next.js
- Backend: Lightweight API backend
- Storage: SQLite for local self hosted use
- PDF Export: HTML/CSS rendering with Puppeteer
- Deployment: Docker Compose

---

## License

To be decided.