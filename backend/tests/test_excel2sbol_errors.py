import io
import json
import sys
import types
from pathlib import Path

import pytest

pytest.importorskip("flask")
pytest.importorskip("flask_cors")
pytest.importorskip("flask_swagger_ui")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

for module_name in ("tricahue", "sbol2", "pudu"):
    sys.modules.setdefault(module_name, types.SimpleNamespace())

sbol2build = types.SimpleNamespace(
    abstract_translator=types.SimpleNamespace(),
    golden_gate_assembly_plan=lambda *args, **kwargs: None,
)
sys.modules.setdefault("sbol2build", sbol2build)
sys.modules.setdefault("sbol2build.abstract_translator", sbol2build.abstract_translator)

from sbs_server.app.main import app
from sbs_server.app import views


def test_upload_resource_returns_friendly_excel2sbol_value_error(monkeypatch):
    monkeypatch.setenv("SYNBIOHUB_PASSWORD", "super-secret-password")

    class FailingXDC:
        def __init__(self, input_excel_path, attachments=None):
            print("starting Excel2SBOL conversion with super-secret-password")
            raise ValueError("bad pattern for super-secret-password")

    monkeypatch.setattr(views.tricahue, "XDC", FailingXDC)

    client = app.test_client()
    params = {
        "sbh_url": "https://synbiohub.example",
        "sbh_token": "token",
        "sbh_user": None,
        "sbh_pass": None,
        "collection_url": "https://synbiohub.example/public/test_collection/test_collection_collection/1",
        "sbh_overwrite": 0,
    }

    response = client.post(
        "/api/uploadResource",
        data={
            "Metadata": (io.BytesIO(b"fake workbook"), "metadata.xlsx"),
            "Params": (io.BytesIO(json.dumps(params).encode("utf-8")), "params.json"),
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["status"] == "error"
    assert payload["error"]["code"] == "E_WORKBOOK_VALUE"
    assert payload["error"]["message"] == "A value in the Excel file could not be converted to SBOL."
    assert payload["error"]["hint"] == "Check the reported sheet, column, row, or pattern requirement."
    assert "bad pattern" in payload["error"]["details"]
    assert "technical_details" in payload["error"]
    assert "STDOUT:" in payload["error"]["technical_details"]["terminal_output"]
    assert "starting Excel2SBOL conversion" in payload["error"]["technical_details"]["terminal_output"]
    assert "Traceback" in payload["error"]["technical_details"]["traceback"]
    assert "ValueError" in payload["error"]["technical_details"]["traceback"]
    assert "super-secret-password" not in json.dumps(payload)
    assert "[REDACTED]" in json.dumps(payload)
    assert "details_url" not in payload["error"]
