# System overview

## Top-level architecture

SynBioSuite currently spans four main areas:

| Area | Description |
| --- | --- |
| Frontend SPA | React + Vite application for local and cloud-oriented workflows |
| Backend API | Flask service for uploads, build helpers, and diagnostics |
| CI/CD | GitHub Actions for frontend deployment and backend image publishing |
| Infrastructure config | Terraform for Microsoft app registration |

## Runtime shape

The main runtime model is:

1. The browser loads the SPA.
2. The user enters the local workspace flow.
3. The app reads and writes files using browser filesystem APIs.
4. Selected actions call external services or the SynBioSuite backend.

## External systems referenced by the repo

| System | Current role |
| --- | --- |
| iBioSim connector | Simulation / analysis submission |
| SBOLCanvas | SBOL editing surface |
| SynBioHub | Repository login, collection lookup, uploads |
| Flapjack | Repository login and data upload path |
| SeqImprove | Iframe-linked design workflow |
| Azure AD + Microsoft Graph | OneDrive login and file access |

## What is clearly the active user flow

The active frontend path is the local workspace route:

- landing page at `/`
- local workspace at `/local`

The OneDrive route exists in code as `CloudHome`, but it is not currently exposed in the router and the landing page hides the OneDrive button.

## Repository layout

```text
SynBioSuite/
  .github/workflows/
  backend/
  frontend/
  iac/
  README.md
```

## Maintenance takeaway

This is not a monolith with one polished path. It is better understood as:

- one active local-first product path
- several integration surfaces that are functional in parts
- some unfinished backend and cloud features that still need cleanup before they should be documented as supported behavior
