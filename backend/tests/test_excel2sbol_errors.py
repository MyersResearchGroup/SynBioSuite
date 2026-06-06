import json
import sys
import types
from io import BytesIO
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "sbs_server"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


class _FakePartShop:
    pass


def _install_optional_dependency_stubs():
    sys.modules.setdefault("tricahue", types.SimpleNamespace())
    sys.modules.setdefault("pudu", types.SimpleNamespace())
    sys.modules.setdefault("sbol2", types.SimpleNamespace(Document=object, PartShop=_FakePartShop))

    if "flask_swagger_ui" not in sys.modules:
        def get_swaggerui_blueprint(*args, **kwargs):
            from flask import Blueprint
            return Blueprint("swagger_ui_stub", __name__)

        sys.modules["flask_swagger_ui"] = types.SimpleNamespace(
            get_swaggerui_blueprint=get_swaggerui_blueprint,
        )


_install_optional_dependency_stubs()
from app.main import app  # noqa: E402
from app import views  # noqa: E402


def test_excel2sbol_value_error_returns_friendly_error_with_technical_details(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("SYNBIOHUB_PASSWORD", "super-secret")

    class FailingXDC:
        def __init__(self, *args, **kwargs):
            print("started conversion with super-secret")
            raise ValueError("bad value contains super-secret")

    monkeypatch.setattr(views.tricahue, "XDC", FailingXDC, raising=False)

    params = {
        "sbh_url": "https://synbiohub.example",
        "sbh_token": "token",
        "sbh_user": None,
        "sbh_pass": None,
        "fj_url": None,
        "fj_token": None,
        "fj_user": None,
        "fj_pass": None,
        "collection_url": "https://synbiohub.example/user/collection/1",
        "sbh_overwrite": 0,
        "fj_overwrite": 1,
        "attachments": {},
    }

    response = app.test_client().post(
        "/api/uploadResource",
        data={
            "Metadata": (BytesIO(b"excel bytes"), "metadata.xlsx"),
            "Params": (BytesIO(json.dumps(params).encode("utf-8")), "params.json"),
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["status"] == "error"
    assert payload["error"]["code"] == "E_WORKBOOK_VALUE"
    assert payload["error"]["message"] == "A value in the Excel file could not be converted to SBOL."
    assert payload["error"]["hint"] == "Check the reported sheet, column, row, or pattern requirement."
    assert payload["error"]["details"] == "bad value contains [REDACTED]"
    assert "started conversion with [REDACTED]" in payload["error"]["technical_details"]["terminal_output"]
    assert "Traceback" in payload["error"]["technical_details"]["traceback"]
    assert "ValueError" in payload["error"]["technical_details"]["traceback"]
    assert "super-secret" not in payload["error"]["details"]
    assert "super-secret" not in payload["error"]["technical_details"]["terminal_output"]
    assert "super-secret" not in payload["error"]["technical_details"]["traceback"]
