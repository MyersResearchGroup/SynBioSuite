# Getting started

## Audience

This documentation is written for maintainers, contributors, and researchers who need to understand the codebase before changing it.

## Prerequisites

### Frontend

- Node.js `>16`
- npm `>=8`
- Chromium-based browser for the local filesystem workflow

### Backend

- Docker is the safest current path
- Direct Python setup is possible, but the repository currently contains versioning and startup inconsistencies, so Docker is the clearer baseline

## Frontend environment variables

The current codebase and workflows reference the following frontend environment variables:

| Variable | Purpose |
| --- | --- |
| `VITE_IBIOSIM_API` | iBioSim connector endpoint |
| `VITE_SBOL_CANVAS_URL` | SBOLCanvas instance URL |
| `VITE_SYNBIOSUITE_API` | SynBioSuite backend base URL |
| `VITE_SEQIMPROVE_URL` | SeqImprove iframe URL |
| `VITE_CLIENT_ID` | Azure AD application client ID for Microsoft login |

## Important browser note

The default product path is the local workspace flow, which relies on browser filesystem support and is explicitly described in the UI as Chromium-only.

## Current repo reality

At the moment, the repository is easiest to understand as:

- a local-file-first frontend
- a helper backend for uploads and build-related operations
- a partially implemented cloud / OneDrive path that still exists in code but is not exposed as the primary user flow
