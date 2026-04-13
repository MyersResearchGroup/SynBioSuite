# Developers: Architecture

## Top-level architecture

| Area | Description |
| --- | --- |
| Frontend SPA | React + Vite app for local workspace and integrations |
| Backend API | Flask routes for uploads, diagnostics, and build helpers |
| CI/CD | GitHub Actions for frontend deploy and backend images |
| Infrastructure | Terraform for Azure AD app registration |

## Runtime model (current dominant path)

1. User enters the SPA landing page.
2. User selects local filesystem workflow.
3. Workspace operations run in-browser with file-system APIs.
4. Specific actions call external services and/or backend endpoints.

## External systems referenced

- iBioSim connector
- SBOLCanvas
- SynBioHub
- Flapjack
- SeqImprove
- Azure AD + Microsoft Graph

## Workspace data model highlights

Frontend behavior is object-type driven (`frontend/src/objectTypes.js`):

- Object types define file matching, subdirectories, and UI labels.
- Panel selection maps object type -> panel type.
- Common local subdirectories include `resources/`, `plasmids/`, `strains/`, `buildPlans/`, `sampleDesigns/`, `experimentalSetups/`, `experimentalResults/`, `plateReaderOutputs/`, and `xdc/`.

## Architecture caveat

The repo contains both active flows and partially productized paths. Treat this as a current-state implementation snapshot rather than a unified, fully stabilized platform.
