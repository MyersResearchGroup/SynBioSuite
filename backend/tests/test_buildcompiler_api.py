import base64
import hashlib
import io
import json
import zipfile

import sbol2
import pytest

from buildcompiler.api import (
    BuildOptions,
    SynBioHubAuthenticationError,
    SynBioHubNetworkError,
    SynBioHubResourceError,
    SynBioHubResponseError,
)
from sbs_server.app import buildcompiler_service
from sbs_server.app.buildcompiler_service import CAPABILITIES_SCHEMA_VERSION
from sbs_server.app.main import app


def test_buildcompiler_capabilities_are_versioned_and_json_safe():
    response = app.test_client().get("/api/buildcompiler/capabilities")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["schema_version"] == CAPABILITIES_SCHEMA_VERSION
    assert payload["buildcompiler"]["api"] == "clean"
    assert payload["buildcompiler"]["version"]
    assert "assembly_lvl1" in payload["stages"]
    assert "none" in payload["protocol_modes"]
    assert payload["defaults"]["planning"]["combinatorial"]["max_variants"] > 0
    assert payload["bounds"]["max_upload_bytes"] > 0
    assert isinstance(payload["availability"]["automation"], bool)
    assert isinstance(payload["availability"]["opentrons"], bool)
    json.dumps(payload)


def test_buildcompiler_capabilities_respect_positive_runtime_limits(monkeypatch):
    monkeypatch.setenv("SBS_BUILD_MAX_UPLOAD_BYTES", "2048")
    monkeypatch.setenv("SBS_BUILD_TIMEOUT_SECONDS", "30")

    payload = app.test_client().get("/api/buildcompiler/capabilities").get_json()

    assert payload["bounds"]["max_upload_bytes"] == 2048
    assert payload["bounds"]["request_timeout_seconds"] == 30


def test_buildcompiler_capabilities_reject_invalid_runtime_limits(monkeypatch):
    monkeypatch.setenv("SBS_BUILD_MAX_UPLOAD_BYTES", "not-a-number")
    monkeypatch.setenv("SBS_BUILD_TIMEOUT_SECONDS", "-1")

    payload = app.test_client().get("/api/buildcompiler/capabilities").get_json()

    assert payload["bounds"]["max_upload_bytes"] == 10 * 1024 * 1024
    assert payload["bounds"]["request_timeout_seconds"] == 120


def test_buildcompiler_timeout_uses_a_stable_retryable_error(monkeypatch):
    monkeypatch.setenv("SBS_BUILD_TIMEOUT_SECONDS", "1")

    def timeout(*_args, **_kwargs):
        raise buildcompiler_service._RequestDeadlineExceeded()

    monkeypatch.setattr(buildcompiler_service, "_prepare_plan", timeout)
    response = app.test_client().post(
        "/api/buildcompiler/plan",
        json={"design": {"source": "local", "content": "ignored"}},
    )

    assert response.status_code == 504
    payload = response.get_json()
    assert payload["error"]["code"] == "BUILD_TIMEOUT"
    assert payload["error"]["details"]["timeout_seconds"] == 1
    assert payload["error"]["correlation_id"] == response.headers["X-Correlation-ID"]


def _local_sbol_payload():
    sbol2.setHomespace("https://example.org")
    document = sbol2.Document()
    design = sbol2.ComponentDefinition("test_part", sbol2.BIOPAX_DNA)
    document.addComponentDefinition(design)
    return {
        "design": {
            "source": "local",
            "identity": design.identity,
            "content": document.writeString(),
        },
        "options": {},
    }


def _buildable_sbol_payload():
    sbol2.setHomespace("https://example.org")
    document = sbol2.Document()
    part_specs = [
        ("promoter", "http://identifiers.org/so/SO:0000167"),
        ("rbs", "http://identifiers.org/so/SO:0000139"),
        ("coding_sequence", "http://identifiers.org/so/SO:0000316"),
        ("terminator", "http://identifiers.org/so/SO:0000141"),
    ]
    parts = []
    for display_id, role in part_specs:
        part = sbol2.ComponentDefinition(display_id, sbol2.BIOPAX_DNA)
        part.roles = [role]
        document.addComponentDefinition(part)
        parts.append(part)
    design = sbol2.ComponentDefinition("two_part_design", sbol2.BIOPAX_DNA)
    document.addComponentDefinition(design)
    components = []
    for part in parts:
        component = design.components.create(f"{part.displayId}_component")
        component.definition = part.identity
        components.append(component)
    for index, (left, right) in enumerate(zip(components, components[1:])):
        precedes = design.sequenceConstraints.create(f"precedes_{index}")
        precedes.subject = left.identity
        precedes.object = right.identity
        precedes.restriction = sbol2.SBOL_RESTRICTION_PRECEDES
    return {
        "design": {
            "source": "local",
            "identity": design.identity,
            "content": document.writeString(),
        },
        "options": {},
    }


def test_buildcompiler_plan_is_json_safe_and_deterministic():
    client = app.test_client()
    payload = _local_sbol_payload()

    first = client.post("/api/buildcompiler/plan", json=payload)
    second = client.post("/api/buildcompiler/plan", json=payload)

    assert first.status_code == 200
    assert first.get_json() == second.get_json()
    result = first.get_json()
    assert len(result["plan_id"]) == 64
    assert result["status"] == "blocked"
    assert result["summary"]["unsupported"] == 1
    assert result["plan"]["schema_version"] == "1.0"
    assert result["plan"]["kind"] == "build_plan"
    json.dumps(result)


def test_buildcompiler_plan_rejects_invalid_sbol_and_options():
    client = app.test_client()
    invalid_sbol = client.post(
        "/api/buildcompiler/plan",
        json={"design": {"source": "local", "content": "not SBOL"}},
    )
    invalid_options = client.post(
        "/api/buildcompiler/plan",
        json={
            **_local_sbol_payload(),
            "options": {"planning": {"combinatorial": {"max_variants": 999}}},
        },
    )

    assert invalid_sbol.status_code == 422
    assert invalid_sbol.get_json()["error"]["code"] == "INVALID_SBOL"
    assert invalid_options.status_code == 400
    assert invalid_options.get_json()["error"]["code"] == "INVALID_OPTIONS"


def test_buildcompiler_rejects_unsafe_paths_and_ignores_preapproved_ids():
    client = app.test_client()
    unsafe_path = client.post(
        "/api/buildcompiler/plan",
        json={
            **_local_sbol_payload(),
            "options": {"protocol": {"results_dir": "/tmp/client-selected"}},
        },
    )
    preapproved = client.post(
        "/api/buildcompiler/plan",
        json={
            **_local_sbol_payload(),
            "options": {"approvals": {"approved_approval_ids": ["hidden-grant"]}},
        },
    )
    unapproved = client.post("/api/buildcompiler/plan", json=_local_sbol_payload())

    assert unsafe_path.status_code == 400
    assert unsafe_path.get_json()["error"]["code"] == "INVALID_OPTIONS"
    assert preapproved.status_code == 200
    assert preapproved.get_json()["plan_id"] == unapproved.get_json()["plan_id"]


def test_buildcompiler_plan_requires_a_request_scoped_synbiohub_token():
    response = app.test_client().post(
        "/api/buildcompiler/plan",
        json={
            "design": {"source": "synbiohub", "uri": "https://example.org/design"},
            "inventory": {
                "registry": "https://example.org",
                "collections": ["https://example.org/public/parts_collection/1"],
            },
        },
    )

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "AUTH_REQUIRED"


@pytest.mark.parametrize(
    ("exception", "status", "code"),
    [
        (SynBioHubAuthenticationError("private-token"), 401, "INVALID_CREDENTIALS"),
        (SynBioHubResourceError("private-token"), 404, "SYNBIOHUB_RESOURCE_NOT_FOUND"),
        (SynBioHubNetworkError("private-token"), 502, "SYNBIOHUB_NETWORK_ERROR"),
        (SynBioHubResponseError("private-token"), 502, "SYNBIOHUB_RESPONSE_ERROR"),
    ],
)
def test_buildcompiler_normalizes_synbiohub_failures_without_tokens(
    monkeypatch, exception, status, code
):
    token = "private-token"

    def fail(**kwargs):
        assert kwargs["auth_token"] == token
        raise exception

    monkeypatch.setattr(
        buildcompiler_service.BuildCompiler,
        "from_synbiohub",
        staticmethod(fail),
    )
    response = app.test_client().post(
        "/api/buildcompiler/plan",
        headers={"X-SynBioHub-Token": token},
        json={
            "design": {
                "source": "synbiohub",
                "uri": "https://example.org/design",
            },
            "inventory": {
                "registry": "https://example.org",
                "collections": ["https://example.org/collection"],
            },
        },
    )

    assert response.status_code == status
    assert response.get_json()["error"]["code"] == code
    assert token not in response.get_data(as_text=True)


def test_buildcompiler_api_uses_an_origin_allowlist_and_security_headers():
    client = app.test_client()
    allowed = client.get(
        "/api/buildcompiler/capabilities",
        headers={"Origin": "http://localhost:5173"},
    )
    denied = client.get(
        "/api/buildcompiler/capabilities",
        headers={"Origin": "https://untrusted.example"},
    )

    assert allowed.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert "Access-Control-Allow-Origin" not in denied.headers
    assert allowed.headers["Cache-Control"] == "no-store"
    assert allowed.headers["X-Content-Type-Options"] == "nosniff"
    assert allowed.headers["X-Correlation-ID"]


def test_buildcompiler_preflight_allows_the_frontend_token_header():
    response = app.test_client().options(
        "/api/buildcompiler/plan",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type, x-synbiohub-token",
        },
    )

    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert "x-synbiohub-token" in response.headers[
        "Access-Control-Allow-Headers"
    ].lower()


def test_buildcompiler_unexpected_errors_are_safe_and_correlated(monkeypatch):
    token = "private-token"

    def fail(*_args, **_kwargs):
        raise RuntimeError(token)

    monkeypatch.setattr("sbs_server.app.views.create_plan", fail)
    response = app.test_client().post(
        "/api/buildcompiler/plan",
        headers={"X-SynBioHub-Token": token},
        json={"design": {"source": "local", "content": "ignored"}},
    )

    assert response.status_code == 500
    payload = response.get_json()
    assert payload["error"]["code"] == "INTERNAL_ERROR"
    assert payload["error"]["correlation_id"] == response.headers["X-Correlation-ID"]
    assert token not in response.get_data(as_text=True)


def test_buildcompiler_compile_verifies_and_packages_the_plan(monkeypatch):
    plan_dto = {
        "schema_version": "1.0",
        "kind": "build_plan",
        "lvl2_requests": [],
        "lvl1_requests": [],
        "domestication_requests": [],
        "unsupported": [],
        "warnings": [],
    }

    class FakeDocument:
        @staticmethod
        def writeString():
            return "<sbol />"

    class FakeCompiler:
        sbol_document = FakeDocument()

        @staticmethod
        def execute(raw_plan, options):
            assert raw_plan == {"raw": "plan"}
            assert options.approvals.approved_approval_ids == {"approval-1"}
            return {"status": "success", "products": ["product-1"]}

    monkeypatch.setattr(
        buildcompiler_service,
        "_prepare_plan",
        lambda request, auth_token: (
            FakeCompiler(),
            BuildOptions(),
            {"raw": "plan"},
            {
                "plan_id": "expected-plan",
                "status": "ready",
                "plan": plan_dto,
            },
        ),
    )
    monkeypatch.setattr(
        buildcompiler_service, "deserialize_build_plan", lambda value: {"raw": "plan"}
    )
    monkeypatch.setattr(
        buildcompiler_service, "serialize_build_plan", lambda value: plan_dto
    )
    monkeypatch.setattr(
        buildcompiler_service, "serialize_build_result", lambda value: value
    )

    response = app.test_client().post(
        "/api/buildcompiler/compile",
        json={
                "plan_id": "expected-plan",
                "plan": plan_dto,
                "request": {"design": {}},
            "approvals": ["approval-1"],
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    artifact = base64.b64decode(payload["artifact"]["data"])
    assert payload["status"] == "success"
    assert payload["artifact"]["sha256"] == hashlib.sha256(artifact).hexdigest()
    assert payload["artifact"]["contents"] == [
        {
            "description": "Serialized BuildCompiler result and verified plan identifier.",
            "filename": "build-result.json",
            "media_type": "application/json",
            "stage": "reporting",
            "type": "build_result",
            "validation_status": "not_applicable",
        },
        {
            "description": "SBOL 2 document produced by the BuildCompiler run.",
            "filename": "build-output.xml",
            "media_type": "application/rdf+xml",
            "stage": "final",
            "type": "sbol",
            "validation_status": "not_run",
        },
    ]
    with zipfile.ZipFile(io.BytesIO(artifact)) as archive:
        assert archive.namelist() == ["build-output.xml", "build-result.json"]
        report = json.loads(archive.read("build-result.json"))
        assert report["plan_id"] == "expected-plan"
        assert report["result"]["products"] == ["product-1"]


def test_buildcompiler_compile_rejects_stale_or_blocked_plans(monkeypatch):
    prepared = [
        (None, BuildOptions(), object(), {"plan_id": "actual-plan", "status": "ready"}),
        (None, BuildOptions(), object(), {"plan_id": "expected-plan", "status": "blocked"}),
    ]
    monkeypatch.setattr(
        buildcompiler_service,
        "_prepare_plan",
        lambda request, auth_token: prepared.pop(0),
    )
    client = app.test_client()
    request = {
        "plan_id": "expected-plan",
        "plan": {},
        "request": {},
        "approvals": [],
    }

    mismatch = client.post("/api/buildcompiler/compile", json=request)
    blocked = client.post("/api/buildcompiler/compile", json=request)

    assert mismatch.status_code == 409
    assert mismatch.get_json()["error"]["code"] == "PLAN_MISMATCH"
    assert blocked.status_code == 409
    assert blocked.get_json()["error"]["code"] == "PLAN_BLOCKED"


def test_buildcompiler_real_plan_compile_and_artifact_round_trip():
    client = app.test_client()
    request_payload = _buildable_sbol_payload()
    plan_response = client.post("/api/buildcompiler/plan", json=request_payload)

    assert plan_response.status_code == 200
    planned = plan_response.get_json()
    assert planned["status"] == "ready"
    assert planned["plan"]["kind"] == "build_plan"
    assert planned["summary"]["assembly_lvl1"] == 1
    assert planned["plan"]["lvl1_requests"][0]["constraints"] == {
        "ordered_part_identities": [
            "https://example.org/promoter/1",
            "https://example.org/rbs/1",
            "https://example.org/coding_sequence/1",
            "https://example.org/terminator/1",
        ]
    }

    compile_response = client.post(
        "/api/buildcompiler/compile",
        json={
            "plan_id": planned["plan_id"],
            "plan": planned["plan"],
            "request": request_payload,
            "approvals": [],
        },
    )

    assert compile_response.status_code == 200
    compiled = compile_response.get_json()
    assert compiled["result"]["kind"] == "build_result"
    assert compiled["result"]["plan"] == planned["plan"]
    assert compiled["result"]["missing_inputs"]
    assert "ordered_part_identities" not in "\n".join(
        line
        for stage in compiled["result"]["stage_results"]
        for line in stage["logs"]
    )
    artifact = base64.b64decode(compiled["artifact"]["data"])
    assert compiled["artifact"]["sha256"] == hashlib.sha256(artifact).hexdigest()
    with zipfile.ZipFile(io.BytesIO(artifact)) as archive:
        assert set(archive.namelist()) == {"build-output.xml", "build-result.json"}
