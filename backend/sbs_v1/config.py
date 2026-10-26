"""Collection settings, read from the x-sbs-collections block of the OpenAPI spec."""
from pathlib import Path

import yaml

SPEC_PATH = Path(__file__).resolve().parents[1] / "sbs_server" / "app" / "static" / "openapi.yaml"

with SPEC_PATH.open() as f:
    _spec = yaml.safe_load(f)

DEFAULTS = _spec["x-sbs-defaults"]

# Each collection's settings, with defaults filled in for anything it doesn't set.
COLLECTIONS = {
    name: {"homespace": DEFAULTS["homespace"], "template": None, "implemented": True, **settings}
    for name, settings in _spec["x-sbs-collections"].items()
}


def collection_name(path):
    """'/strains/template' -> 'strains'."""
    return path.strip("/").split("/")[0]


# Fail at startup, not on the first request, if a path in the spec has no settings.
for _path in _spec["paths"]:
    if _path != "/status" and collection_name(_path) not in COLLECTIONS:
        raise RuntimeError(f"{_path} is in the spec but has no entry in x-sbs-collections")