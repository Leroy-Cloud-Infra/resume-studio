# Schema Notes

## Overview

Resume Studio stores resumes as structured, schema driven data rather than freeform documents.

The schema is designed to support:
- controlled editing
- predictable rendering
- reusable templates
- reliable PDF export
- section reordering
- future portability

The schema should remain intentionally simple during Phase 1.

---

# Core Resume Model

A resume contains:
- metadata
- template selection
- ordered sections
- structured section content

---

# Initial Resume Structure

```json
{
  "id": "resume_001",
  "schemaVersion": 1,
  "title": "Software Engineering Resume",
  "templateId": "classic",
  "createdAt": "",
  "updatedAt": "",
  "sections": []
}
```

---

# Section Model

Each section should:
- have a type
- support ordering
- support visibility
- contain structured content
- remain template agnostic

Example:

```json
{
  "id": "section_001",
  "type": "experience",
  "heading": "Experience",
  "position": 1,
  "visible": true,
  "content": {}
}
```

Section content should not contain template specific layout instructions.

Templates should remain presentation focused.

---

# Initial Supported Section Types

- header
- summary
- skills
- experience
- projects
- education
- certifications

---

# Header Section

```json
{
  "name": "Cesar Hernandez",
  "email": "example@email.com",
  "phone": "",
  "location": "",
  "links": []
}
```

---

# Summary Section

```json
{
  "text": ""
}
```

---

# Skills Section

```json
{
  "groups": [
    {
      "id": "skills_group_001",
      "title": "Languages",
      "items": [
        "JavaScript",
        "TypeScript"
      ]
    }
  ]
}
```

---

# Experience Section

```json
{
  "items": [
    {
      "id": "exp_001",
      "company": "",
      "title": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "bullets": [
        {
          "id": "bullet_001",
          "text": ""
        }
      ]
    }
  ]
}
```

---

# Projects Section

```json
{
  "items": [
    {
      "id": "project_001",
      "name": "",
      "description": "",
      "bullets": [
        {
          "id": "bullet_001",
          "text": ""
        }
      ],
      "links": []
    }
  ]
}
```

---

# Education Section

```json
{
  "items": [
    {
      "id": "education_001",
      "school": "",
      "degree": "",
      "location": "",
      "startDate": "",
      "endDate": ""
    }
  ]
}
```

---

# Certifications Section

```json
{
  "items": [
    {
      "id": "cert_001",
      "name": "",
      "issuer": "",
      "date": ""
    }
  ]
}
```

---

# Schema Design Principles

The schema should prioritize:
- predictable rendering
- simple editing workflows
- portability
- maintainability
- template independence

The schema should avoid:
- deeply nested complexity
- arbitrary rich text structures
- template specific coupling
- excessive MVP flexibility

---

# Phase 1 Schema Target

Phase 1 should support:
- one resume
- one template
- editable sections
- editable bullet lists
- live rendering
- PDF export

The schema does not need:
- multi user support
- version history
- imports
- AI metadata
- collaboration systems

---

# Open Questions

- should dates remain plain strings or structured date objects?
- should skills support proficiency levels?
- should section visibility be configurable per template?
- should sections support optional compact rendering modes?
- how much customization should templates expose?