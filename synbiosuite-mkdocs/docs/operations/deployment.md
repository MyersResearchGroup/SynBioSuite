# Deployment

## Frontend deployment

The frontend is deployed through the Azure Static Web Apps workflow in `.github/workflows/azure-static-web-apps-witty-hill-08172a210.yml`.

### Current behavior

- triggers on pushes to `master`
- also handles pull-request preview lifecycle
- builds from `frontend/`
- publishes `frontend/dist`

### Current build-time environment values in workflow

| Variable | Current value source |
| --- | --- |
| `VITE_IBIOSIM_API` | Azure workflow env |
| `VITE_SBOL_CANVAS_URL` | Azure workflow env |
| `VITE_SYNBIOSUITE_API` | Azure workflow env |
| `VITE_SEQIMPROVE_URL` | Azure workflow env |

## Backend image publishing

There are currently two backend image workflows:

| Workflow | Target |
| --- | --- |
| `docker-build.yml` | GitHub Container Registry |
| `docker-image.yml` | DockerHub |

Both trigger on changes under `backend/**` on `master`.

## Backend container build

The backend Docker image currently:

- uses `tiangolo/uwsgi-nginx-flask:python3.10`
- copies `backend/sbs_server` into `/app`
- installs dependencies from `backend/requirements.txt`

## Docs deployment

This MkDocs starter is intentionally independent of the current app deployment workflows. You can publish it separately with any MkDocs-compatible static hosting target after running:

```bash
mkdocs build
```

If you want, a follow-up pass can add a dedicated docs deployment workflow to GitHub Pages or Azure Static Web Apps.
