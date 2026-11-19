"""The /api/v1 routing: one blueprint, bound to the handlers in api/views.py.

The legacy /api/* routes are in legacy_routes.py.
"""
from __future__ import annotations
from functools import partial

from flask import Blueprint

from .main import app
from .api import views
from .api.errors import register_error_handlers
from .api.registry import COLLECTIONS

URL_PREFIX = '/api/v1'


# The bulk collection API (/api/v1). Its handlers are in api/views.py; each
# collection in the registry gets the same set of routes.
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


# Registered after the legacy /api/* routes (main.py imports legacy_routes
# first) so those keep precedence; the two surfaces do not overlap.
app.register_blueprint(build_api_blueprint())
