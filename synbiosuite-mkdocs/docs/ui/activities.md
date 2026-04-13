# Activities

## Overview

The left activity bar is the primary high-level navigation surface in the local workspace.

Most activities reuse the same explorer component but filter the visible object types differently.

## Current activities

| Title | ID | Purpose |
| --- | --- | --- |
| Entire Workflow | `synbio.activity.entire-workflow` | Broad explorer over all object types |
| Resources | `synbio.activity.resource-selection` | Resource and repository-focused view |
| Design | `synbio.activity.design` | Design-focused view for SBOL |
| Model | `synbio.activity.models` | Model and analysis view |
| Build | `synbio.activity.build` | Build planning and plasmid-related view |
| Test | `synbio.activity.test` | Metadata, studies, results, plate reader outputs |
| Learn | `synbio.activity.learn` | Flapjack-oriented view |
| Check Login Status | `synbio.activity.login-status-panel` | Opens login modal flow |
| GitHub and Website | `synbio.activity.GitHub` | External links / repo-facing view |
| Report Bug | `synbio.activity.bug-report` | Bug report view |

## Conditional Microsoft activities

When a Microsoft account is active, the frontend adds:

- `OneDrive Explorer`
- `Check Microsoft Login Status`

These are conditional UI additions, not part of the always-on route structure.

## Behavioral notes

- Choosing the login-status activity immediately opens the login modal and resets the activity selection toward the local explorer flow.
- Choosing the Microsoft status activity opens the Microsoft modal.
- Activity titles, icons, and object filters are defined centrally in `frontend/src/activities.js`.
