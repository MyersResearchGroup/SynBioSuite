#!/bin/sh
set -eu

# Generate runtime configuration
python - <<'PY'
import json
import os

config = {
    "SYNBIOSUITE_API": os.getenv("VITE_SYNBIOSUITE_API", "http://127.0.0.1:5003"),
    "SEQIMPROVE_URL": os.getenv(
        "VITE_SEQIMPROVE_URL",
        "https://seqimprove.synbiohub.org"
    ),
    "SBOL_CANVAS_URL": os.getenv(
        "VITE_SBOL_CANVAS_URL",
        "https://sbolcanvas.org"
    ),
    "IBIOSIM_API": os.getenv("VITE_IBIOSIM_API", "https://ibiosimconnector-api.azurewebsites.net/api/orchestrators/analyze")
}

with open("/usr/share/nginx/html/synbiosuite/config.js", "w") as f:
    f.write("window.SYNBIOSUITE_CONFIG = ")
    json.dump(config, f)
    f.write(";\n")
PY
