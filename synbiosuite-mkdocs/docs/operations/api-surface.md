# API surface

## Summary

The backend API is currently a mix of:

- a few working utility endpoints
- shared upload plumbing
- placeholder routes
- partially implemented build routes

## Endpoint table

| Endpoint | Method | Intended purpose | Current status |
| --- | --- | --- | --- |
| `/api/status` | GET | Health check | Works |
| `/api/uploadResource` | POST | Upload metadata/resource package | Wired, but contract mismatch exists |
| `/api/uploadExperiment` | POST | Upload experiment metadata | Wired, uses same helper |
| `/api/uploadAssembly` | POST | Assembly upload | Returns 501 |
| `/api/uploadTransformation` | POST | Transformation upload | Returns 501 |
| `/sbol_2_build_golden_gate` | POST | Golden Gate build-plan generation | Incomplete |
| `/api/build_pudu` | POST | PUDU build path | Placeholder, returns 501 |
| `/api/inspect_request` | POST | Request-debug helper | Works for diagnostics |
| `/api/docs` | GET | Swagger UI | Exposed by Flask app |

## Current upload contract warning

There is an important mismatch between frontend and backend expectations for resource upload:

- the frontend helper currently builds `Params` with keys such as `sbh_collec` and `sbh_collec_desc`
- the backend helper explicitly requires `collection_url`

That mismatch should be resolved before `uploadResource` is documented as stable.

## Golden Gate route status

The Golden Gate route accepts:

- `plasmid_backbone`
- one or more `insert_parts`
- `wizard_selections`

However, the implementation still contains undefined references and should be treated as unfinished.

## Diagnostic endpoint

`/api/inspect_request` is useful during integration cleanup because it reads uploaded files and echoes parsed JSON back in the response.
