from __future__ import annotations
from .downloadTemplates import sbh_download_template
from .synbiohubUpload import sbh_upload, sbh_fj_upload
from flask import request, jsonify
from flask_cors import CORS
from .main import app
from .version import __version__
import json
from uuid import uuid4

#routes
#check if the app is running
@app.route('/api/status')
def pin():
    return jsonify({"status": "working", "version": __version__}), 200

@app.route('/api/downloadTemplate', methods = ['POST'])
def download_template():
    return sbh_download_template(request.files)

@app.route('/api/uploadSBOL', methods = ['POST'])
def upload_sbol():
    return sbh_upload(request.files)

@app.route('/api/uploadResource', methods = ['POST'])
def upload_resource():
    return sbh_fj_upload(request.files)

@app.route('/api/uploadAssembly', methods = ['POST'])
def upload_assembly():
    return 'Not implemented yet', 501

@app.route('/api/uploadTransformation', methods = ['POST'])
def upload_transformation():
    return 'Not implemented yet', 501

@app.route('/api/uploadExperiment', methods = ['POST'])
def upload_experiment():
    return sbh_fj_upload(request.files)

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

