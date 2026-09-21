# Changelog

All notable changes to Resume Studio will be documented in this file.

## [1.0.0] - 2026-09-21

## Overview

Resume Studio v1.0.0 is a focused, self-hosted structured resume-authoring application. It provides a controlled workspace for tailoring resume content, organizing document structure, reviewing a live preview, and exporting reliable PDF resumes.

The resume document remains the primary artifact, with structured editing and predictable presentation taking priority over freeform page design.

## Highlights

- Structured editing for core resume content
- Section, entry, and bullet reordering
- Section-level inclusion and exclusion without deleting stored content
- Resume-scoped in-memory Undo and Redo
- Live preview with page-count and one-page usage feedback
- Text-based, single-column PDF export
- Versioned browser-local persistence
- Containerized self-hosted deployment

## Editing capabilities

The editor supports:

- Header and contact information
- Summary
- Experience
- Projects
- Technical Skills
- Education
- Custom Sections

Structural editing includes top-level section ordering, Experience entry ordering, Project entry ordering, Education entry ordering, and Experience and Project bullet ordering. Supported structured content can be added, edited, and removed through the editor.

Sections can be included or excluded while their stored content remains available for later editing. Undo and Redo are scoped to the active resume document and remain available during the current editing session.

## Preview and PDF export

The live preview renders from the canonical resume document and updates as content changes. It reports page count and provides one-page usage feedback where appropriate.

The current Classic presentation uses a conservative, text-based, single-column layout. Browser preview and PDF export use the shared template/rendering path, with server-side PDF generation handled through Playwright.

The output is designed to remain readable and ATS-friendly. Resume Studio does not provide ATS scoring or guarantee compatibility with a particular ATS.

## Persistence

Resume data is stored in a versioned browser-local library. Work remains local to the browser and application environment rather than being synchronized to an account or server.

Undo and Redo history is kept in memory and is not restored after a browser reload.

## Deployment

Resume Studio includes a containerized deployment path using Docker and Docker Compose. The repository’s deployment configuration supports:

- publishing images to GHCR;
- GitHub Actions build and deployment workflows;
- a self-hosted deployment runner;
- Traefik routing;
- health verification through `/api/health`.

## Known limitations

- Resume persistence is browser-local rather than database- or server-backed.
- Undo and Redo history does not survive a browser reload.
- Classic is currently the only available template.
- Certifications have canonical model and rendering support but do not yet have a complete editor workflow.
- The preview uses a continuous document surface with page awareness rather than physical page-sheet visualization.
- The application is designed primarily for one local or self-hosted user rather than collaborative multi-user operation.

## Closing statement

Resume Studio v1.0.0 establishes the production baseline for real resume-tailoring work. Future changes will be guided by workflow needs discovered through continued use.
