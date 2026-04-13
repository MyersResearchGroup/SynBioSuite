# Known gaps

This page captures repository-state issues that are visible directly from the current codebase.

## User-facing product gaps

### 1. OneDrive flow is implemented in code but hidden in the product entry path

Evidence in the current frontend:

- `CloudHome` still exists
- the `/onedrive` route is commented out
- the landing page hides the Microsoft sign-in button behind `false && ...`

### 2. Chromium-only local workflow is still the main exposed path

The landing page explicitly directs users to local filesystem usage through Chrome / Chromium-based browsers.

## Frontend/backend integration gaps

### 3. Resource upload contract mismatch

The frontend `upload_resource()` helper sends:

- `sbh_collec`
- `sbh_collec_desc`

The backend upload helper requires:

- `collection_url`

This looks like a real integration bug, not just documentation drift.

### 4. SBOL save side effect should be documented carefully

Saving an SBOL file also writes a sibling SBML file. This is useful behavior, but it is currently implicit in command code rather than clearly surfaced as product behavior.

## Backend maturity gaps

### 5. `uploadAssembly` and `uploadTransformation` explicitly return 501

These routes are present but not implemented.

### 6. `build_pudu` explicitly returns 501

The route contains placeholder execution logic and then returns a not-implemented response.

### 7. `sbol_2_build_golden_gate` appears incomplete

The route contains undefined references and should not yet be documented as stable.

### 8. Backend startup patterns are inconsistent

The repository currently contains:

- an app singleton in `app/main.py`
- an app factory in `app/__init__.py`
- a stale `startup.py` import path

## Infra and deployment gaps

### 9. Terraform is partial and currently malformed for redirect URIs

`iac/main.tf` only addresses Azure AD app registration and the redirect URI line needs repair.

### 10. README drift exists

Examples include:

- backend Python version guidance that does not match the current Docker base image
- older startup instructions that do not line up cleanly with the current backend layout

## Local code smell worth a cleanup ticket

### 11. `LocalHome.jsx` renders `UnifiedModal` twice

This may not break the app immediately, but it should be cleaned up to avoid modal lifecycle confusion.
