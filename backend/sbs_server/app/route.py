from __future__ import annotations
from flask import request, jsonify, send_file
import json

from .main import app
from .version import __version__
from .errors import ApiError
from .services import sbol_upload, template_download, xdc

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
