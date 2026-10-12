from __future__ import annotations
from functools import partial

from flask import Blueprint, request, jsonify, send_file
import json

from .main import app
from .version import __version__
from .errors import ApiError
from .services import sbol_upload, template_download, xdc
from .api import views
from .api.errors import register_error_handlers
from .api.registry import COLLECTIONS

URL_PREFIX = '/api/v1'

# The services these routes call raise ApiError; this renders it the way the
# /api/v1 blueprint does (api/errors.py). Anything else propagates as before.
@app.errorhandler(ApiError)
def handle_api_error(err):
    return jsonify({"error": err.message}), err.status

#routes
#check if the app is running
@app.route('/api/status')
def pin():
    return jsonify({"status": "working", "version": __version__}), 200

@app.route('/api/downloadTemplate', methods = ['POST'])
def download_template():
    output, filename = template_download.run(template_download.parse_request(request.files))
    return send_file(
        output,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.ms-excel.sheet.macroEnabled.12",
    )

@app.route('/api/uploadSBOL', methods = ['POST'])
def upload_sbol():
    return jsonify(sbol_upload.run(sbol_upload.parse_request(request.files))), 200

@app.route('/api/uploadResource', methods = ['POST'])
def upload_resource():
    return jsonify(xdc.run(xdc.parse_request(request.files))), 200

@app.route('/api/uploadExperiment', methods = ['POST'])
def upload_experiment():
    return jsonify(xdc.run(xdc.parse_request(request.files))), 200

@app.route('/api/uploadAssembly', methods = ['POST'])
def upload_assembly():
    return 'Not implemented yet', 501

@app.route('/api/uploadTransformation', methods = ['POST'])
def upload_transformation():
    return 'Not implemented yet', 501

@app.route('/api/inspect_request', methods=['POST'])
def inspect_request():
    files = {}
    for name in request.files:
        file = request.files[name]
        try:
            files[name] = json.loads(file.read())
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    return jsonify({
        "message": "Request received successfully",
        "files": files}), 200


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


# Registered after the legacy /api/* routes above so those keep precedence;
# the two surfaces do not overlap.
app.register_blueprint(build_api_blueprint())
