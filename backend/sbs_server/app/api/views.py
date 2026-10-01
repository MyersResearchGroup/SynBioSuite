"""Generic collection handlers for /api/v1.

One implementation per verb, bound to every collection in the registry by
__init__.py.
"""
import os

from flask import Response, jsonify, request, send_file

from ..downloadTemplates import build_template
from ..version import __version__
from . import sbh
from .context import StudyContext
from .errors import ApiError
from .ingest import load_document
from .registry import CollectionSpec

UPLOAD_FIELD = 'file'


def status():
    """Liveness check. Unauthenticated, per the spec."""
    return jsonify({'status': 'working', 'version': __version__}), 200


def list_collection(spec: CollectionSpec):
    """All contents of the collection.

    JSON by default; `Accept: application/rdf+xml` streams the sub-collection's
    SBOL instead. A collection with no members is an empty result, not a 404 --
    only a study that does not exist is a 404.
    """
    ctx = _context_for(spec)
    collection_uri = ctx.subcollection_uri(spec.import_type)

    if _wants_rdf():
        body = sbh.fetch_collection_sbol(ctx, collection_uri)
        if not body:
            # Absent sub-collection: empty, not an error -- same rule the JSON
            # branch follows, so answer an empty document rather than no bytes.
            _require_study(ctx)
            body = sbh.EMPTY_SBOL_DOCUMENT
        return Response(body, mimetype='application/rdf+xml')

    items = sbh.list_items(ctx, collection_uri)
    if not items:
        _require_study(ctx)
    return jsonify(items), 200


def create_in_collection(spec: CollectionSpec):
    """Add to the collection, updating any objects whose URIs already exist.

    POST is the only add-or-update verb for collection content -- PATCH is
    scoped to assay attachments -- so it submits with merge-and-overwrite,
    matching what xdc_run does today.
    """
    ctx = _context_for(spec)
    _require_study(ctx)
    upload_dir = _upload_dir()

    doc = load_document(spec, _uploaded_file(), upload_dir)
    # Count before submitting: upload_to_sbh adds the sub-collection object to
    # the document, so len(doc) afterwards is one too high.
    uploaded = len(doc)
    sbh.submit(ctx, spec, doc, upload_dir, overwrite_merge=sbh.MERGE_AND_OVERWRITE)

    return jsonify({
        'status': 'success',
        'message': f'Uploaded {uploaded} object(s) to /{spec.path}',
    }), 201


def replace_collection(spec: CollectionSpec):
    """Make the collection contain exactly what was uploaded.

    The file is validated and converted before anything is cleared, so a bad
    upload cannot empty the collection.
    """
    ctx = _context_for(spec)
    _require_study(ctx)
    upload_dir = _upload_dir()

    doc = load_document(spec, _uploaded_file(), upload_dir)
    uploaded = len(doc)  # same reason as in create_in_collection
    sbh.replace(ctx, spec, doc, upload_dir)

    return jsonify({
        'status': 'success',
        'message': f'/{spec.path} now contains {uploaded} object(s)',
    }), 200


def clear_collection(spec: CollectionSpec):
    """Empty the collection.

    Members are unlinked, not destroyed: the sub-collection object survives and
    a subsequent GET returns an empty array rather than 404.
    """
    ctx = _context_for(spec)
    _require_study(ctx)
    sbh.clear_collection(ctx, spec)
    return '', 204


def download_template(spec: CollectionSpec):
    """The blank Excel template for this collection.

    Data rows are empty; the SBH_* lookup sheets are populated from the study so
    the sheet can cross-reference objects that already exist. Which template is
    fixed by the collection, so there is nothing for the caller to choose.
    """
    ctx = _context_for(spec)
    _require_study(ctx)
    try:
        output, filename = build_template(
            spec.template_type, ctx.sbh_url, ctx.token, ctx.study_uri
        )
    except Exception as error:
        raise ApiError(502, f'Could not build the {spec.path} template: {error}')

    return send_file(
        output,
        as_attachment=True,
        download_name=filename,
        mimetype='application/vnd.ms-excel.sheet.macroEnabled.12',
    )


def attach_to_object(spec: CollectionSpec, object_id: str):
    """Add an attachment to one SBOL object in this collection.

    The only per-item route in the API: attaching a file has to name its object.
    """
    ctx = _context_for(spec)

    object_uri = sbh.resolve_member(ctx, spec, object_id)
    filename = sbh.attach(ctx, object_uri, _uploaded_file())

    return jsonify({
        'status': 'success',
        'message': f'Attached {filename} to {object_uri}',
    }), 200


def _context_for(spec: CollectionSpec) -> StudyContext:
    """Reject unspecified collections before asking the caller for credentials."""
    if not spec.implemented:
        raise ApiError(501, f'/{spec.path} is not specified yet')
    return StudyContext.from_request()


def _uploaded_file():
    if UPLOAD_FIELD not in request.files:
        raise ApiError(
            400,
            f'No file uploaded. Send multipart/form-data with a "{UPLOAD_FIELD}" part.',
        )
    return request.files[UPLOAD_FIELD]


def _wants_rdf():
    """True only when the client explicitly asked for RDF.

    A bare Accept: */* picks the first offer, so JSON stays the default.
    """
    return request.accept_mimetypes.best_match(
        ['application/json', 'application/rdf+xml'], default='application/json'
    ) == 'application/rdf+xml'


def _require_study(ctx):
    """404 unless the study collection itself exists.

    Writes and the template check up front. Left to SynBioHub, a missing study
    surfaces as a 204 (DELETE finds nothing to unlink) or a 502 (POST and PUT
    fail at /submit) -- and those calls are slow enough that failing fast on a
    mistyped study is worth the extra request. GET checks only when a
    collection comes back empty, so a populated one still costs one query.
    """
    if not sbh.study_exists(ctx):
        raise ApiError(404, f'No study collection at {ctx.study_uri}')


def _upload_dir():
    # Same location route.py uses for its temp files.
    return os.path.join(os.getcwd(), 'uploads')

