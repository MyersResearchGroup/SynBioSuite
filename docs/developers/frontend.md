# Developers: Frontend

## Stack

- React 18
- Vite
- Redux Toolkit
- `react-router-dom`
- Mantine
- MSAL (`@azure/msal-browser`)

## Routes

| Route | State |
| --- | --- |
| `/` | Active landing page |
| `/local` | Active local workspace |
| `/onedrive` | Present in code but route commented out |
| `*` | Redirect to `/` |

## UX shell

Local workspace is built from:

- Activities (left sidebar)
- Panels (tabbed center work area)
- Unified modal flows (auth/integration tasks)

## Store slices

- `activities`
- `workingDirectory`
- `panels`
- `saveIndicator`
- `failureMessage`
- `modal`
- `overlay`

## Important behavior notes

- Landing page explicitly promotes local Chrome/Chromium workflow.
- OneDrive sign-in CTA is hidden in landing page markup.
- Activity selection may trigger modal side effects (login status, Microsoft status).
- `LocalHome.jsx` currently renders `UnifiedModal` twice.
