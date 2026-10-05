"""The bulk, collection-level REST API served at /api/v1.

Collection-level GET / POST / PUT / DELETE over the object types SynBioSuite
models, scoped to one study by the X-Study-Collection header, with SynBioHub as
the datastore. Per-item access is delegated to SynBioHub itself, except for
PATCH /assays/<id>/attachments, which must name the object it attaches to.
"""
from functools import partial

from flask import Blueprint

from . import views
from .errors import register_error_handlers
from .registry import COLLECTIONS

URL_PREFIX = '/api/v1'


def build_api_blueprint() -> Blueprint:
    bp = Blueprint('api_v1', __name__, url_prefix=URL_PREFIX)
    register_error_handlers(bp)

    bp.add_url_rule('/status', 'status', views.status, methods=['GET'])

    for spec in COLLECTIONS.values():
        _bind(bp, spec, '', 'list', views.list_collection, 'GET')
        _bind(bp, spec, '', 'create', views.create_in_collection, 'POST')
        _bind(bp, spec, '', 'replace', views.replace_collection, 'PUT')
        _bind(bp, spec, '', 'clear', views.clear_collection, 'DELETE')

        if spec.template_type:
            _bind(bp, spec, '/template', 'template',
                  views.download_template, 'GET')

        # The one per-item route: attaching a file has to name its SBOL object.
        if spec.path == 'assays':
            _bind(bp, spec, '/<object_id>/attachments', 'attach',
                  views.attach_to_object, 'PATCH')

    return bp


def _bind(bp, spec, suffix, verb, view, method):
    # Blueprint endpoint names may not contain a dot.
    endpoint = f"{spec.path.replace('-', '_')}_{verb}"
    bp.add_url_rule(
        f'/{spec.path}{suffix}',
        endpoint,
        partial(view, spec),
        methods=[method],
    )
