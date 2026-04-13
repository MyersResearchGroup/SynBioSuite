# Local development

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Create a `.env` file in `frontend/` with values similar to the following:

```env
VITE_IBIOSIM_API=https://ibiosimconnector-api.azurewebsites.net/api/orchestrators/analyze
VITE_SBOL_CANVAS_URL=https://sbolcanvas.org
VITE_SYNBIOSUITE_API=http://localhost:5003
VITE_SEQIMPROVE_URL=https://seqimprove.synbiohub.org
VITE_CLIENT_ID=your-azure-ad-client-id
```

Notes:

- `VITE_CLIENT_ID` is only required if you re-enable the Microsoft / OneDrive path.
- The local filesystem workflow is the active default path and is exposed at `/local`.

## Backend with Docker

```bash
cd backend
docker build -t synbiosuite-api .
docker run -p 5003:5003 synbiosuite-api
```

The backend image currently uses a `tiangolo/uwsgi-nginx-flask:python3.10` base image.

## Backend without Docker

The repository README still describes a direct Python installation path, but the backend currently mixes:

- README instructions that mention Python 3.9.20
- a Dockerfile based on Python 3.10
- multiple Flask startup patterns in code

Use Docker first unless you are actively cleaning up backend packaging.

## Docs site

```bash
pip install -r requirements-docs.txt
mkdocs serve
```

Then open the local MkDocs server shown in the terminal.
