# SynBioSuite

This documentation describes the current repository state of **SynBioSuite** as reviewed from the `master` branch on April 13, 2026.

It is intentionally written as a **state-of-the-code** reference, not a roadmap. Where the repository contains partial, hidden, or inconsistent features, those are called out directly.

## What SynBioSuite is today

SynBioSuite is a browser-based synthetic biology workspace centered on:

- a React + Vite single-page application in `frontend/`
- a Flask backend in `backend/`
- a small Terraform configuration in `iac/`
- GitHub Actions workflows for frontend deployment and backend image publishing

## Current top-level status

### Working and clearly wired

- Local browser-first workflow exposed from the landing page
- Activity sidebar + tabbed panel workspace
- Object-type driven file organization
- Backend health endpoint and upload-oriented API surface
- Frontend deployment through Azure Static Web Apps CI/CD
- Backend container build/publish workflows

### Present in code but not fully productized

- Microsoft OneDrive / Azure AD flow
- Assembly and transformation backend routes
- PUDU build route
- Terraform-backed Microsoft app registration
- Several backend startup and integration paths

## Repository map

| Path | Role |
| --- | --- |
| `frontend/` | Main web application |
| `backend/` | Flask API and helper scripts |
| `iac/` | Azure AD / Terraform configuration |
| `.github/workflows/` | CI/CD for frontend and backend |

## Recommended reading order

1. [Getting started](getting-started/index.md)
2. [System overview](architecture/system-overview.md)
3. [Frontend](architecture/frontend.md)
4. [Backend](architecture/backend.md)
5. [Known gaps](operations/known-gaps.md)

## Documentation goals

This site is meant to help a new maintainer answer four questions quickly:

1. What is actually live in the repository?
2. Which paths are local-only vs cloud-oriented?
3. How do frontend, backend, and external services connect?
4. Which parts need cleanup before they should be treated as production-ready?
