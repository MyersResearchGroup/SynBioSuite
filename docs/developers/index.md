# Developers: Overview

This section documents the current implementation state for maintainers and contributors.

## Repository map

| Path | Role |
| --- | --- |
| `frontend/` | React + Vite SPA and local workspace UX |
| `backend/` | Flask API and helper logic |
| `iac/` | Terraform for Microsoft identity configuration |
| `.github/workflows/` | Frontend deploy and backend image workflows |

## Practical startup path

- Frontend: `cd frontend && npm install && npm run dev`
- Backend (recommended): build/run Docker image from `backend/`

## Environment variables used by frontend

| Variable | Purpose |
| --- | --- |
| `VITE_IBIOSIM_API` | iBioSim connector endpoint |
| `VITE_SBOL_CANVAS_URL` | SBOLCanvas URL |
| `VITE_SYNBIOSUITE_API` | SynBioSuite backend base URL |
| `VITE_SEQIMPROVE_URL` | SeqImprove URL |
| `VITE_CLIENT_ID` | Azure AD client ID (Microsoft login path) |

## Docs local run

From repository root:

```bash
pip install -r requirements-docs.txt
mkdocs serve
```
