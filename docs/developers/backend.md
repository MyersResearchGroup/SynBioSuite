# Developers: Backend

## Role

The Flask backend currently provides:

- health/status route(s)
- upload-oriented endpoints
- Swagger UI endpoint
- partial build/assembly helper routes

## Key files

| File | Purpose |
| --- | --- |
| `backend/sbs_server/app/main.py` | Flask app singleton and Swagger setup |
| `backend/sbs_server/app/views.py` | Route handlers |
| `backend/sbs_server/app/utils.py` | Build/helper utilities |
| `backend/Dockerfile` | Containerized backend runtime |
| `backend/startup.py` | Alternate startup path (stale risk) |

## Endpoint status snapshot

| Endpoint | Method | Status |
| --- | --- | --- |
| `/api/status` | GET | Works |
| `/api/uploadResource` | POST | Wired |
| `/api/uploadExperiment` | POST | Wired |
| `/api/uploadAssembly` | POST | Returns 501 |
| `/api/uploadTransformation` | POST | Returns 501 |
| `/sbol_2_build_golden_gate` | POST | Incomplete/unstable |
| `/api/build_pudu` | POST | Placeholder, returns 501 |
| `/api/inspect_request` | POST | Diagnostic helper |
| `/api/docs` | GET | Swagger UI |

## Known integration mismatch

Frontend upload params and backend required fields are not fully aligned for resource upload (notably `collection_url` expectations). Treat this path as needing cleanup before declaring stable.
