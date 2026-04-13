# Users: Overview

## What SynBioSuite is for

SynBioSuite is a workspace for synthetic biology project files and analysis activities. In the current codebase, the primary supported path is local, browser-mediated file work (create/import/edit/save files in a structured workspace).

The app also contains integrations with external systems, including:

- SBOLCanvas
- iBioSim API
- SynBioHub
- SeqImprove
- Flapjack
- Microsoft OneDrive (partially exposed)

## How users enter and work in the app

1. Open the landing page (`/`).
2. Select **Use my local file system through Chrome**.
3. Enter the local workspace (`/local`) and use:
   - the left sidebar activities to filter and organize work
   - center tabs (panels) to edit and process files

### Browser constraint

The landing page explicitly states the local workflow depends on Chrome/Chromium filesystem APIs and is not supported in Safari/Firefox.

## Current user workflow reality

- The local flow is the default and visibly supported route.
- A OneDrive flow exists in code but is not routed from the main app entry.
- Some integrations are present as panels or object types but their full end-to-end workflow is not always evident.

Where intent is unclear, these docs use placeholders (for example: `[placeholder: explain exact upload destination behavior for X panel]`).
