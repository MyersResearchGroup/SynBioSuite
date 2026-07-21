# BuildCompiler integration

SynBioSuite runs the BuildCompiler HTTP boundary in the backend container and keeps
provider credentials in the browser session. SynBioHub access tokens are sent only
on the individual request using `X-SynBioHub-Token`; they are not included in JSON
payloads, build records, artifacts, or backend storage.

## Local development

1. Copy `frontend/.env.example` to `frontend/.env.local`. The default
   `VITE_SYNBIOSUITE_API=http://localhost:5003` points the Vite frontend at the
   exposed backend port.
2. Start the backend with `docker compose up --build backend`.
3. Install and start the frontend with `cd frontend`, `npm ci`, and `npm run dev`.
4. Confirm `http://localhost:5003/api/status` reports `working`, then open the Vite
   URL and create a BuildCompiler run from the Build activity.

The backend image uses Python 3.10 with Pandas 2.3.3 and NumPy 1.26.2. Tricahue
is pinned to a resolved DRAGGON-Lab `dev` commit. Its heavier
Excel-to-Flapjack/SciPy import graph is loaded only when an upload endpoint is
used, so health and BuildCompiler routes start independently.

Use `SBS_BACKEND_PORT` to change the host port. When it changes, set
`VITE_SYNBIOSUITE_API` to the same host and port. `SBS_CORS_ORIGINS` is a
comma-separated allowlist and must contain the frontend origin.

## HTTP workflow

- `GET /api/buildcompiler/capabilities` returns schema/version information,
  supported stages, defaults, bounds, optional automation availability, and route
  availability.
- `POST /api/buildcompiler/plan` accepts a local SBOL document or a SynBioHub URI,
  inventory collections, and BuildCompiler options. It returns a deterministic
  `plan_id`, JSON-safe plan, blockers, warnings, and required approvals.
- `POST /api/buildcompiler/compile` accepts the original request, its `plan_id`, and
  run-scoped approval IDs. The backend replans and rejects stale or changed input,
  executes the approved plan, and returns a Base64 ZIP with SHA-256 integrity data.

Every BuildCompiler response includes an `X-Correlation-ID`. Safe error bodies repeat
that identifier so an unexpected failure can be diagnosed without exposing tokens,
exception representations, or server-local paths. Planning and compilation enforce
the configured synchronous deadline and return `BUILD_TIMEOUT` with HTTP 504 when it
is exceeded.

The ZIP contains `build-result.json` and the generated `build-output.xml`. The
response describes each member, including media type, stage, and SBOL validation
status. The frontend also writes a non-secret, timestamped
`buildPlans/build-<plan-id>-<timestamp>.build.json` record containing the design,
inventory, options, verified plan, approvals, result, and artifact. Opening that
record restores the workflow directly at the Results stage. Planning and compilation
can be cancelled from the wizard; approvals are cleared whenever a plan is regenerated
and compilation remains disabled until all approvals for that run are granted.

## Runtime limits

The container recognizes:

- `SBS_BUILD_MAX_UPLOAD_BYTES` (default 10 MiB)
- `SBS_BUILD_MAX_ARTIFACT_BYTES` (default 25 MiB)
- `SBS_BUILD_TIMEOUT_SECONDS` (default 120 seconds)

Protocol automation and Opentrons support remain optional and are reported through
the capabilities endpoint. Planning and non-automated builds do not import those
optional dependencies.
