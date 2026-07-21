"""Thin, JSON-safe boundary around the clean BuildCompiler API."""

from __future__ import annotations

import importlib.util
import base64
import hashlib
import io
import json
import os
import signal
import threading
import zipfile
from contextlib import contextmanager
from dataclasses import fields, is_dataclass
from enum import Enum
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
from typing import Any

import sbol2

from buildcompiler.api import (
    SCHEMA_VERSION,
    BuildCompiler,
    BuildOptions,
    ProtocolMode,
    SerializationError,
    SynBioHubAuthenticationError,
    SynBioHubConfigurationError,
    SynBioHubNetworkError,
    SynBioHubResourceError,
    SynBioHubResponseError,
    deserialize_build_plan,
    serialize_build_plan,
    serialize_build_result,
)
from buildcompiler.domain import BuildStage


CAPABILITIES_SCHEMA_VERSION = SCHEMA_VERSION
DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
DEFAULT_MAX_ARTIFACT_BYTES = 25 * 1024 * 1024
DEFAULT_REQUEST_TIMEOUT_SECONDS = 120


class _RequestDeadlineExceeded(Exception):
    pass


class BuildCompilerAPIError(Exception):
    """Expected, client-safe API failure with a stable machine-readable code."""

    def __init__(self, code: str, message: str, status: int, details: dict | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.details = details or {}

    def payload(self, correlation_id: str | None = None) -> dict[str, Any]:
        return {
            "schema_version": CAPABILITIES_SCHEMA_VERSION,
            "error": {
                "code": self.code,
                "message": self.message,
                **({"details": self.details} if self.details else {}),
                **({"correlation_id": correlation_id} if correlation_id else {}),
            },
        }


def _installed_version() -> str:
    try:
        return version("synbio-buildcompiler")
    except PackageNotFoundError:
        return "unknown"


def _json_safe(value: Any) -> Any:
    if is_dataclass(value):
        return {field.name: _json_safe(getattr(value, field.name)) for field in fields(value)}
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, set):
        return sorted(_json_safe(item) for item in value)
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in sorted(value.items())}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return value


def _positive_int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if value > 0 else default


def _deadline_alarm(_signum: int, _frame: Any) -> None:
    raise _RequestDeadlineExceeded()


@contextmanager
def _request_deadline():
    timeout = _positive_int_env(
        "SBS_BUILD_TIMEOUT_SECONDS", DEFAULT_REQUEST_TIMEOUT_SECONDS
    )
    can_interrupt = (
        hasattr(signal, "SIGALRM")
        and hasattr(signal, "setitimer")
        and threading.current_thread() is threading.main_thread()
    )
    if not can_interrupt:
        yield
        return

    previous_handler = signal.getsignal(signal.SIGALRM)
    previous_timer = signal.getitimer(signal.ITIMER_REAL)
    signal.signal(signal.SIGALRM, _deadline_alarm)
    signal.setitimer(signal.ITIMER_REAL, timeout)
    try:
        yield
    except _RequestDeadlineExceeded as error:
        raise BuildCompilerAPIError(
            "BUILD_TIMEOUT",
            "The BuildCompiler request exceeded its configured runtime limit.",
            504,
            {"timeout_seconds": timeout},
        ) from error
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous_handler)
        if previous_timer[0] > 0:
            signal.setitimer(signal.ITIMER_REAL, *previous_timer)


def _merge_dataclass(instance: Any, values: dict[str, Any], path: str = "options") -> Any:
    if not isinstance(values, dict):
        raise BuildCompilerAPIError(
            "INVALID_OPTIONS", f"{path} must be an object.", 400
        )
    known = {field.name: field for field in fields(instance)}
    unknown = sorted(set(values) - set(known))
    if unknown:
        raise BuildCompilerAPIError(
            "INVALID_OPTIONS",
            f"Unknown {path} field(s).",
            400,
            {"fields": unknown},
        )
    for key, value in values.items():
        current = getattr(instance, key)
        child_path = f"{path}.{key}"
        if is_dataclass(current):
            _merge_dataclass(current, value, child_path)
        elif isinstance(current, Enum):
            try:
                setattr(instance, key, type(current)(value))
            except (TypeError, ValueError) as error:
                raise BuildCompilerAPIError(
                    "INVALID_OPTIONS", f"Invalid value for {child_path}.", 400
                ) from error
        elif isinstance(current, set):
            if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
                raise BuildCompilerAPIError(
                    "INVALID_OPTIONS", f"{child_path} must be a list of strings.", 400
                )
            setattr(instance, key, set(value))
        else:
            expected_type = type(current) if current is not None else None
            if expected_type is bool and not isinstance(value, bool):
                raise BuildCompilerAPIError(
                    "INVALID_OPTIONS", f"{child_path} must be a boolean.", 400
                )
            if expected_type is int and (
                not isinstance(value, int) or isinstance(value, bool)
            ):
                raise BuildCompilerAPIError(
                    "INVALID_OPTIONS", f"{child_path} must be an integer.", 400
                )
            if expected_type is str and not isinstance(value, str):
                raise BuildCompilerAPIError(
                    "INVALID_OPTIONS", f"{child_path} must be a string.", 400
                )
            if current is None and value is not None and not isinstance(value, str):
                raise BuildCompilerAPIError(
                    "INVALID_OPTIONS", f"{child_path} must be a string or null.", 400
                )
            setattr(instance, key, value)
    return instance


def _validated_options(values: dict[str, Any] | None) -> BuildOptions:
    options = _merge_dataclass(BuildOptions(), values or {})
    if options.approvals.scope not in {"run", "persistent"}:
        raise BuildCompilerAPIError(
            "INVALID_OPTIONS", "options.approvals.scope is invalid.", 400
        )
    if options.protocol.results_dir is not None:
        raise BuildCompilerAPIError(
            "INVALID_OPTIONS",
            "options.protocol.results_dir is controlled by the backend.",
            400,
        )
    # Approval grants are accepted only by /compile and are always scoped to that run.
    options.approvals.approved_processes = set()
    options.approvals.approved_approval_ids = set()
    options.approvals.scope = "run"
    limits = capabilities()["bounds"]
    positive_bounded = {
        "planning.combinatorial.max_variants": (
            options.planning.combinatorial.max_variants,
            limits["max_variants"],
        ),
        "planning.lvl2_search.max_exhaustive_region_count": (
            options.planning.lvl2_search.max_exhaustive_region_count,
            limits["max_exhaustive_region_count"],
        ),
        "execution.max_iterations": (
            options.execution.max_iterations,
            limits["max_iterations"],
        ),
        "reporting.max_rejected_routes": (
            options.reporting.max_rejected_routes,
            limits["max_rejected_routes"],
        ),
    }
    invalid = [
        field for field, (value, maximum) in positive_bounded.items()
        if not isinstance(value, int) or isinstance(value, bool) or value < 1 or value > maximum
    ]
    if invalid:
        raise BuildCompilerAPIError(
            "INVALID_OPTIONS",
            "One or more numeric options are outside the supported bounds.",
            400,
            {"fields": invalid},
        )
    return options


def _local_designs(design: dict[str, Any]) -> tuple[sbol2.Document, list[Any]]:
    content = design.get("content")
    if not isinstance(content, str) or not content.strip():
        raise BuildCompilerAPIError(
            "INVALID_DESIGN", "design.content must contain an SBOL document.", 400
        )
    if len(content.encode("utf-8")) > capabilities()["bounds"]["max_upload_bytes"]:
        raise BuildCompilerAPIError("PAYLOAD_TOO_LARGE", "The SBOL document is too large.", 413)
    document = sbol2.Document()
    try:
        document.readString(content)
    except Exception as error:
        raise BuildCompilerAPIError(
            "INVALID_SBOL", "The supplied design is not valid SBOL 2.", 422
        ) from error

    identity = design.get("identity")
    if identity:
        selected = document.find(identity)
        if selected is None:
            raise BuildCompilerAPIError(
                "DESIGN_NOT_FOUND", "The requested design identity was not found.", 404
            )
        return document, [selected]
    designs = [
        *document.combinatorialDerivations,
        *document.moduleDefinitions,
        *document.componentDefinitions,
    ]
    if not designs:
        raise BuildCompilerAPIError(
            "DESIGN_NOT_FOUND", "The SBOL document contains no buildable designs.", 422
        )
    return document, designs


def _remote_compiler(
    design: dict[str, Any], inventory: dict[str, Any], options: BuildOptions, auth_token: str | None
) -> tuple[BuildCompiler, list[Any]]:
    registry = inventory.get("registry") or design.get("registry")
    collections = inventory.get("collections") or []
    if not registry or not collections:
        raise BuildCompilerAPIError(
            "INVALID_INVENTORY",
            "A SynBioHub registry and at least one collection are required.",
            400,
        )
    if not auth_token:
        raise BuildCompilerAPIError("AUTH_REQUIRED", "SynBioHub authentication is required.", 401)
    collection_uris = [
        item.get("uri") if isinstance(item, dict) else item for item in collections
    ]
    if not all(isinstance(uri, str) and uri for uri in collection_uris):
        raise BuildCompilerAPIError(
            "INVALID_INVENTORY", "Every inventory collection must have a URI.", 400
        )
    try:
        compiler = BuildCompiler.from_synbiohub(
            collections=collection_uris,
            sbh_registry=registry,
            auth_token=auth_token,
            options=options,
        )
    except SynBioHubConfigurationError as error:
        raise BuildCompilerAPIError(
            "INVALID_INVENTORY",
            "The SynBioHub inventory configuration is invalid.",
            400,
        ) from error
    except SynBioHubAuthenticationError as error:
        raise BuildCompilerAPIError(
            "INVALID_CREDENTIALS", "SynBioHub rejected the request credential.", 401
        ) from error
    except SynBioHubResourceError as error:
        raise BuildCompilerAPIError(
            "SYNBIOHUB_RESOURCE_NOT_FOUND",
            "A requested SynBioHub resource was not found.",
            404,
        ) from error
    except SynBioHubNetworkError as error:
        raise BuildCompilerAPIError(
            "SYNBIOHUB_NETWORK_ERROR", "SynBioHub could not be reached.", 502
        ) from error
    except SynBioHubResponseError as error:
        raise BuildCompilerAPIError(
            "SYNBIOHUB_RESPONSE_ERROR", "SynBioHub returned an unusable response.", 502
        ) from error
    identity = design.get("uri") or design.get("identity")
    selected = compiler.sbol_document.find(identity) if identity and compiler.sbol_document else None
    if selected is None:
        raise BuildCompilerAPIError(
            "DESIGN_NOT_FOUND", "The requested SynBioHub design was not found.", 404
        )
    return compiler, [selected]


def _prepare_plan(
    payload: Any, auth_token: str | None = None
) -> tuple[BuildCompiler, BuildOptions, Any, dict[str, Any]]:
    if not isinstance(payload, dict):
        raise BuildCompilerAPIError("INVALID_REQUEST", "The request body must be an object.", 400)
    design = payload.get("design")
    inventory = payload.get("inventory") or {}
    if not isinstance(design, dict):
        raise BuildCompilerAPIError("INVALID_DESIGN", "design must be an object.", 400)
    if not isinstance(inventory, dict):
        raise BuildCompilerAPIError("INVALID_INVENTORY", "inventory must be an object.", 400)
    options = _validated_options(payload.get("options"))
    source = design.get("source", "local")
    if source in {"local", "project"}:
        document, designs = _local_designs(design)
        compiler = BuildCompiler.from_synbiohub(
            sbol_doc=document,
            options=options,
        )
    elif source == "synbiohub":
        compiler, designs = _remote_compiler(design, inventory, options, auth_token)
    else:
        raise BuildCompilerAPIError("INVALID_DESIGN", "Unsupported design source.", 400)

    raw_plan = compiler.plan(designs, options=options)
    plan = serialize_build_plan(raw_plan)
    design_fingerprint = {key: value for key, value in design.items() if key != "content"}
    if isinstance(design.get("content"), str):
        design_fingerprint["content_sha256"] = hashlib.sha256(
            design["content"].encode("utf-8")
        ).hexdigest()
    canonical_input = {
        "design": design_fingerprint,
        "inventory": inventory,
        "options": _json_safe(options),
        "plan": plan,
    }
    plan_id = hashlib.sha256(
        json.dumps(canonical_input, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    counts = {
        "assembly_lvl2": len(plan.get("lvl2_requests", [])),
        "assembly_lvl1": len(plan.get("lvl1_requests", [])),
        "domestication": len(plan.get("domestication_requests", [])),
        "unsupported": len(plan.get("unsupported", [])),
        "warnings": len(plan.get("warnings", [])),
    }
    response = {
        "schema_version": CAPABILITIES_SCHEMA_VERSION,
        "plan_id": plan_id,
        "status": "blocked" if counts["unsupported"] else "ready",
        "plan": plan,
        "summary": counts,
        "required_approvals": [],
    }
    return compiler, options, raw_plan, response


def create_plan(payload: Any, auth_token: str | None = None) -> dict[str, Any]:
    """Validate a request, invoke the clean planner, and return a deterministic DTO."""

    with _request_deadline():
        return _prepare_plan(payload, auth_token)[3]


def _artifact_bundle(
    plan_id: str, result_dto: dict[str, Any], document: Any
) -> dict[str, Any]:
    result_json = json.dumps(
        {
            "schema_version": CAPABILITIES_SCHEMA_VERSION,
            "plan_id": plan_id,
            "result": result_dto,
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    members = {"build-result.json": result_json}
    contents = [
        {
            "filename": "build-result.json",
            "type": "build_result",
            "stage": "reporting",
            "media_type": "application/json",
            "description": "Serialized BuildCompiler result and verified plan identifier.",
            "validation_status": "not_applicable",
        }
    ]
    if document is not None and hasattr(document, "writeString"):
        members["build-output.xml"] = document.writeString().encode("utf-8")
        contents.append(
            {
                "filename": "build-output.xml",
                "type": "sbol",
                "stage": "final",
                "media_type": "application/rdf+xml",
                "description": "SBOL 2 document produced by the BuildCompiler run.",
                "validation_status": "not_run",
            }
        )

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in sorted(members.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, content)
    artifact = buffer.getvalue()
    maximum = capabilities()["bounds"]["max_artifact_bytes"]
    if len(artifact) > maximum:
        raise BuildCompilerAPIError(
            "ARTIFACT_TOO_LARGE",
            "The compiled artifact exceeds the configured response limit.",
            413,
            {"size_bytes": len(artifact), "max_bytes": maximum},
        )
    return {
        "filename": f"build-{plan_id[:12]}.zip",
        "media_type": "application/zip",
        "encoding": "base64",
        "size_bytes": len(artifact),
        "sha256": hashlib.sha256(artifact).hexdigest(),
        "contents": contents,
        "data": base64.b64encode(artifact).decode("ascii"),
    }


def _compile_plan(payload: Any, auth_token: str | None = None) -> dict[str, Any]:
    """Replan, verify, execute, and package a build without server-side secret state."""

    if not isinstance(payload, dict):
        raise BuildCompilerAPIError("INVALID_REQUEST", "The request body must be an object.", 400)
    request_payload = payload.get("request")
    expected_plan_id = payload.get("plan_id")
    if not isinstance(expected_plan_id, str) or not expected_plan_id:
        raise BuildCompilerAPIError("INVALID_PLAN", "plan_id is required.", 400)
    approvals = payload.get("approvals") or []
    if not isinstance(approvals, list) or not all(isinstance(item, str) for item in approvals):
        raise BuildCompilerAPIError(
            "INVALID_APPROVALS", "approvals must be a list of approval IDs.", 400
        )
    submitted_plan = payload.get("plan")
    if not isinstance(submitted_plan, dict):
        raise BuildCompilerAPIError(
            "INVALID_PLAN", "A serialized BuildCompiler plan is required.", 400
        )

    compiler, options, raw_plan, plan_response = _prepare_plan(request_payload, auth_token)
    if plan_response["plan_id"] != expected_plan_id:
        raise BuildCompilerAPIError(
            "PLAN_MISMATCH",
            "The supplied plan no longer matches the build request.",
            409,
            {"actual_plan_id": plan_response["plan_id"]},
        )
    if plan_response["status"] == "blocked":
        raise BuildCompilerAPIError(
            "PLAN_BLOCKED", "The plan contains unsupported designs and cannot compile.", 409
        )

    try:
        approved_plan = deserialize_build_plan(submitted_plan)
    except (SerializationError, TypeError, ValueError) as error:
        raise BuildCompilerAPIError(
            "INVALID_PLAN", "The submitted BuildCompiler plan DTO is invalid.", 400
        ) from error
    if serialize_build_plan(approved_plan) != plan_response["plan"]:
        raise BuildCompilerAPIError(
            "PLAN_MISMATCH", "The submitted plan differs from the verified plan.", 409
        )

    options.approvals.approved_approval_ids = set(approvals)
    try:
        result = compiler.execute(approved_plan, options=options)
    except _RequestDeadlineExceeded:
        raise
    except BuildCompilerAPIError:
        raise
    except Exception as error:
        raise BuildCompilerAPIError(
            "COMPILATION_FAILED",
            "BuildCompiler could not execute the approved plan.",
            422,
            {"type": type(error).__name__},
        ) from error
    safe_result = serialize_build_result(result)
    return {
        "schema_version": CAPABILITIES_SCHEMA_VERSION,
        "plan_id": expected_plan_id,
        "status": safe_result.get("status", "complete") if isinstance(safe_result, dict) else "complete",
        "result": safe_result,
        "artifact": _artifact_bundle(
            expected_plan_id, safe_result, compiler.sbol_document
        ),
    }


def compile_plan(payload: Any, auth_token: str | None = None) -> dict[str, Any]:
    """Compile a verified plan within the configured synchronous request deadline."""

    with _request_deadline():
        return _compile_plan(payload, auth_token)


def capabilities() -> dict[str, Any]:
    """Return the versioned frontend/backend BuildCompiler contract."""

    options = BuildOptions()
    return {
        "schema_version": CAPABILITIES_SCHEMA_VERSION,
        "service": "synbiosuite-buildcompiler",
        "buildcompiler": {
            "version": _installed_version(),
            "api": "clean",
        },
        "stages": [stage.value for stage in BuildStage],
        "protocol_modes": [mode.value for mode in ProtocolMode],
        "defaults": _json_safe(options),
        "bounds": {
            "max_upload_bytes": _positive_int_env(
                "SBS_BUILD_MAX_UPLOAD_BYTES", DEFAULT_MAX_UPLOAD_BYTES
            ),
            "max_artifact_bytes": _positive_int_env(
                "SBS_BUILD_MAX_ARTIFACT_BYTES", DEFAULT_MAX_ARTIFACT_BYTES
            ),
            "request_timeout_seconds": _positive_int_env(
                "SBS_BUILD_TIMEOUT_SECONDS", DEFAULT_REQUEST_TIMEOUT_SECONDS
            ),
            "max_variants": options.planning.combinatorial.max_variants,
            "max_exhaustive_region_count": (
                options.planning.lvl2_search.max_exhaustive_region_count
            ),
            "max_iterations": options.execution.max_iterations,
            "max_rejected_routes": options.reporting.max_rejected_routes,
        },
        "availability": {
            "planning": True,
            "compilation": True,
            "automation": importlib.util.find_spec("pudu") is not None,
            "opentrons": importlib.util.find_spec("opentrons") is not None,
            "simulation_default": options.protocol.simulate,
        },
        "http": {
            "capabilities": "/api/buildcompiler/capabilities",
            "plan": "/api/buildcompiler/plan",
            "compile": "/api/buildcompiler/compile",
            "plan_available": True,
            "compile_available": True,
        },
    }
