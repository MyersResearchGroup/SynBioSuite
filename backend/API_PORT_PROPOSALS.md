# Proposed API Endpoints ("ports") for SynBioSuite

This document lists candidate API endpoints to complement the existing backend routes.

## Why these endpoints

The current API focuses on upload/build workflows. The proposals below add:
- stronger **observability** (`/api/version`, `/api/ready`),
- safer **validation before execution** (`/api/validate/*`),
- async-friendly **job orchestration** (`/api/jobs/*`), and
- better **discoverability/config UX** (`/api/capabilities`).

## Proposed endpoints

| Endpoint | Method | Purpose | Typical response |
|---|---|---|---|
| `/api/version` | `GET` | Return app/build version and git SHA for traceability | `{ "version": "1.1.0", "commit": "abc123" }` |
| `/api/ready` | `GET` | Readiness probe that verifies dependency health | `{ "ready": true, "checks": {"filesystem": "ok"} }` |
| `/api/capabilities` | `GET` | List enabled workflows, accepted file formats, max upload sizes | `{ "features": ["uploadResource", "build_pudu"] }` |
| `/api/validate/uploadResource` | `POST` | Validate `Metadata` + `Params` without executing upload | `{ "valid": false, "errors": [...] }` |
| `/api/validate/golden_gate` | `POST` | Validate parts/backbone and `wizard_selections` before build | `{ "valid": true, "warnings": [...] }` |
| `/api/jobs` | `POST` | Create async job for long-running uploads/builds | `{ "job_id": "...", "status": "queued" }` |
| `/api/jobs/{job_id}` | `GET` | Poll job state and progress | `{ "status": "running", "progress": 55 }` |
| `/api/jobs/{job_id}/artifacts` | `GET` | List downloadable outputs from a completed job | `{ "artifacts": [...] }` |
| `/api/jobs/{job_id}/cancel` | `POST` | Cancel running job | `{ "status": "cancelled" }` |

## Example OpenAPI snippet for a proposed endpoint

```yaml
/api/version:
  get:
    tags: [System]
    summary: Get API version metadata
    responses:
      '200':
        description: Version information
        content:
          application/json:
            schema:
              type: object
              properties:
                version:
                  type: string
                commit:
                  type: string
                build_time:
                  type: string
                  format: date-time
```

## Suggested rollout order

1. Add `/api/version` and `/api/ready` (fast, low-risk).
2. Add `/api/validate/*` for frontend preflight checks.
3. Add `/api/jobs/*` once longer running workflows become common.
