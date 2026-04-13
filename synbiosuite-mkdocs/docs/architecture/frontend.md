# Frontend

## Stack

| Concern | Current implementation |
| --- | --- |
| Build tool | Vite |
| UI | React 18 |
| Routing | `react-router-dom` |
| State | Redux Toolkit |
| Component library | Mantine |
| Microsoft auth | `@azure/msal-browser` |

## Current routes

| Route | Status | Notes |
| --- | --- | --- |
| `/` | Active | Landing page |
| `/local` | Active | Main local workspace |
| `/onedrive` | Present in code, not routed | `CloudHome` import exists, route is commented out |
| `*` | Active | Redirects back to `/` |

## App shell

The local workspace is composed primarily of:

- `Activities` on the left
- `Panels` as the main work area
- a set of modal flows for login, repositories, collections, and unified modal handling

## State slices

The Redux store currently combines these slices:

| Slice | Purpose |
| --- | --- |
| `activities` | Activity selection state |
| `workingDirectory` | Workspace files and directory handle |
| `panels` | Open tabs and active panel |
| `saveIndicator` | Save status UI |
| `failureMessage` | Failure state messaging |
| `modal` | Login and workflow modals |
| `overlay` | Global loading overlay |

## Frontend behavior notes

### Landing page

The landing page explicitly pushes users to the local workflow and warns that the feature only works in Chrome / Chromium-based browsers.

### Microsoft path

Microsoft auth is still initialized at app startup, but the visible OneDrive entry path is hidden:

- the `/onedrive` route is commented out
- the landing page wraps the Microsoft sign-in button in `false && ...`

### Activity-driven UX

The activity bar is not only navigation. Some activities trigger modal side effects:

- selecting the login-status activity opens the login modal
- selecting the Microsoft status activity opens the Microsoft modal

### Panel workspace

Panels are tab-based, reorderable, and tied to object types. The workspace falls back to a welcome screen or a simple empty-state message when no panels are open.

## Code health notes worth preserving in docs

- `LocalHome.jsx` currently renders `UnifiedModal` twice.
- Microsoft auth configuration still hardcodes localhost redirect URIs in `msalInit.js`.
- The cloud-oriented route is code-present but product-hidden.
