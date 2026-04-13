# Backend

## Role

The backend is a Flask application intended to support:

- resource and experiment uploads
- build / assembly helper flows
- diagnostics and health checks
- Swagger UI exposure for the API surface

## Main files

| File | Role |
| --- | --- |
| `backend/sbs_server/app/main.py` | Main Flask app singleton and Swagger registration |
| `backend/sbs_server/app/views.py` | Route handlers |
| `backend/sbs_server/app/utils.py` | SBOL-to-build helper functions |
| `backend/Dockerfile` | Container build definition |
| `backend/startup.py` | Alternate startup file, currently stale |

## Route summary

| Route | Method | Current state |
| --- | --- | --- |
| `/api/status` | GET | Health check |
| `/api/uploadResource` | POST | Wired to shared upload helper |
| `/api/uploadExperiment` | POST | Wired to shared upload helper |
| `/api/uploadAssembly` | POST | Returns 501 |
| `/api/uploadTransformation` | POST | Returns 501 |
| `/sbol_2_build_golden_gate` | POST | Partially implemented and currently inconsistent |
| `/api/build_pudu` | POST | Placeholder, returns 501 |
| `/api/inspect_request` | POST | Diagnostic helper |
| `/api/docs` | GET | Swagger UI |

## Backend implementation notes

### Upload helper

`uploadResource` and `uploadExperiment` both delegate to the same helper that validates:

- `Metadata` Excel upload
- `Params` JSON upload
- SynBioHub / Flapjack-related fields

### Build helpers

The repository contains utility code for generating assembly plans, but the exposed routes are not yet consistently wired into a complete backend product path.

### App startup patterns

The backend currently mixes two Flask styles:

- a singleton app defined in `app/main.py`
- an app factory in `app/__init__.py`

This is workable during cleanup, but it should eventually be normalized.

## Current risk areas

- `startup.py` imports `sbs_server.webapp`, which does not match the backend layout documented elsewhere in the repo snapshot.
- Some build routes reference undefined or missing variables and should be treated as unfinished.
- README instructions and container behavior have drifted apart.
