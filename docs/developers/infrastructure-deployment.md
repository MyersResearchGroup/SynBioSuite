# Developers: Infrastructure / Deployment

## Existing deployment automation

### Frontend

`.github/workflows/azure-static-web-apps-witty-hill-08172a210.yml` builds and deploys the SPA from `frontend/`.

### Backend images

- `.github/workflows/docker-build.yml` (GHCR)
- `.github/workflows/docker-image.yml` (DockerHub)

## Infrastructure as code scope

`iac/` currently focuses on Microsoft identity setup (Azure AD application registration and Graph scopes), not full platform provisioning.

## Important caveats

- Terraform does not provision full app infrastructure (frontend/backend hosting stack).
- Redirect URI configuration needs cleanup before treating as production-ready.
- Frontend MSAL config still references localhost redirect URIs.

## Docs build

This docs site now lives at repository root (`mkdocs.yml` + `docs/`) and can be built with:

```bash
pip install -r requirements-docs.txt
mkdocs build
```
