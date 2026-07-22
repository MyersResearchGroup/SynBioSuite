from __future__ import annotations 
from flask import g, request, jsonify
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
from .main import app
from .buildcompiler_service import (
    BuildCompilerAPIError,
    capabilities,
    compile_plan,
    create_plan,
)

from .version import __version__
import os
import json
from uuid import uuid4
from urllib.parse import urlencode, urlparse

import requests


def _buildcompiler_correlation_id():
    return getattr(g, 'buildcompiler_correlation_id', None)


def _buildcompiler_error_response(error):
    return jsonify(error.payload(_buildcompiler_correlation_id())), error.status


def _valid_http_uri(value):
    if not isinstance(value, str) or not value.strip():
        return False
    parsed = urlparse(value)
    return parsed.scheme in {'http', 'https'} and bool(parsed.netloc) and not any(
        character.isspace() for character in value
    )


def sbh_get_subcollection_members(sbh_url, sbh_token, collection_uri, user_graph=None):
    """Return direct SBOL members of a SynBioHub collection via SPARQL.

    SynBioHub's ``/search/collection=...`` endpoint is not a reliable way to
    enumerate the members of a nested collection. Querying ``sbol:member``
    directly returns both nested collections and the SBOL objects they contain.
    """
    from_graph = f' FROM <{user_graph}>' if user_graph else ''
    query = (
        'PREFIX sbol: <http://sbols.org/v2#> '
        'SELECT DISTINCT ?s ?displayId ?name ?description ?version ?type'
        f'{from_graph} WHERE {{ '
        f'<{collection_uri}> sbol:member ?s . '
        'OPTIONAL { ?s sbol:displayId ?displayId } '
        'OPTIONAL { ?s sbol:name ?name } '
        'OPTIONAL { ?s sbol:description ?description } '
        'OPTIONAL { ?s sbol:version ?version } '
        'OPTIONAL { ?s a ?type } '
        '}'
    )
    response = requests.get(
        f"{sbh_url.rstrip('/')}/sparql?{urlencode({'query': query})}",
        headers={
            'Accept': 'application/json',
            'X-authorization': sbh_token,
        },
        timeout=15,
        allow_redirects=False,
    )
    response.raise_for_status()
    return response.json()


def _sparql_members(payload):
    bindings = payload.get('results', {}).get('bindings', []) if isinstance(payload, dict) else []
    if not isinstance(bindings, list):
        return []

    members = []
    for binding in bindings:
        uri = binding.get('s', {}).get('value')
        if not uri:
            continue
        display_id = binding.get('displayId', {}).get('value') or uri.rstrip('/').split('/')[-2]
        members.append({
            'uri': uri,
            'displayId': display_id,
            'name': binding.get('name', {}).get('value') or display_id,
            'description': binding.get('description', {}).get('value') or '',
            'version': binding.get('version', {}).get('value') or '',
            'type': binding.get('type', {}).get('value') or '',
        })
    return members


@app.before_request
def identify_buildcompiler_request():
    if request.path.startswith('/api/buildcompiler/'):
        g.buildcompiler_correlation_id = str(uuid4())


#routes
#check if the app is running
@app.route('/api/status')
def pin():
    return jsonify({"status": "working", "version": __version__}), 200


@app.route('/api/synbiohub/collection-members', methods=['GET'])
def synbiohub_collection_members():
    registry_url = request.args.get('registry_url', '').rstrip('/')
    collection_uri = request.args.get('collection_uri', '')
    user_graph = request.args.get('user_graph') or None
    auth_token = request.headers.get('X-SynBioHub-Token')

    if not _valid_http_uri(registry_url) or not _valid_http_uri(collection_uri):
        return jsonify({'error': 'registry_url and collection_uri must be valid HTTP(S) URLs.'}), 400
    if user_graph and not _valid_http_uri(user_graph):
        return jsonify({'error': 'user_graph must be a valid HTTP(S) URL.'}), 400
    if not auth_token:
        return jsonify({'error': 'A SynBioHub access token is required.'}), 401

    try:
        payload = sbh_get_subcollection_members(
            registry_url,
            auth_token,
            collection_uri,
            user_graph,
        )
    except requests.RequestException as error:
        return jsonify({'error': f'SynBioHub member query failed: {error}'}), 502
    except ValueError:
        return jsonify({'error': 'SynBioHub returned an invalid member-query response.'}), 502

    return jsonify({'members': _sparql_members(payload)}), 200

@app.route('/api/buildcompiler/capabilities', methods=['GET'])
def buildcompiler_capabilities():
    return jsonify(capabilities()), 200


@app.route('/api/buildcompiler/plan', methods=['POST'])
def buildcompiler_plan():
    try:
        payload = create_plan(
            request.get_json(silent=True),
            auth_token=request.headers.get('X-SynBioHub-Token'),
        )
        return jsonify(payload), 200
    except BuildCompilerAPIError as error:
        return _buildcompiler_error_response(error)
    except Exception:
        return _buildcompiler_error_response(BuildCompilerAPIError(
            'INTERNAL_ERROR',
            'The BuildCompiler request failed unexpectedly.',
            500,
        ))


@app.route('/api/buildcompiler/compile', methods=['POST'])
def buildcompiler_compile():
    try:
        payload = compile_plan(
            request.get_json(silent=True),
            auth_token=request.headers.get('X-SynBioHub-Token'),
        )
        return jsonify(payload), 200
    except BuildCompilerAPIError as error:
        return _buildcompiler_error_response(error)
    except Exception:
        return _buildcompiler_error_response(BuildCompilerAPIError(
            'INTERNAL_ERROR',
            'The BuildCompiler request failed unexpectedly.',
            500,
        ))


@app.errorhandler(RequestEntityTooLarge)
def request_too_large(_error):
    error = BuildCompilerAPIError(
        'PAYLOAD_TOO_LARGE',
        'The request exceeds the configured upload limit.',
        413,
    )
    return _buildcompiler_error_response(error)


@app.after_request
def protect_buildcompiler_responses(response):
    if request.path.startswith('/api/buildcompiler/'):
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Correlation-ID'] = _buildcompiler_correlation_id()
    return response

@app.route('/api/uploadResource', methods = ['POST'])
def upload_resource():
    return sbh_fj_upload(request.files)

@app.route('/api/uploadExperiment', methods = ['POST'])
def upload_experiment():
    return sbh_fj_upload(request.files)



'''
Helper function to upload to SynBioHub and Flapjack using XDC/XDE
'''
def sbh_fj_upload(files):
    try:
        import tricahue
    except ImportError:
        return jsonify({
            "error": {
                "code": "TRICAHUE_UNAVAILABLE",
                "message": "The metadata upload service is not installed.",
            }
        }), 503

    if 'Metadata' not in files:
        return 'No file part', 400
    metadata_file = files['Metadata']
    if metadata_file.filename == '':
        return 'No selected file', 400
    root, extension = os.path.splitext(metadata_file.filename)
    if not extension == '.xlsx' and not extension == '.xlsm':
        return 'Invalid Metadata file format', 400

    # Check params from frontend
    if 'Params' not in files:
        return 'No Params file part', 400
    params_file = files['Params']
    if params_file.filename == '':
        return 'No selected Params file', 400
    params_from_request = json.loads(params_file.read())
    sbh_url = params_from_request.get('sbh_url')
    if sbh_url and not (sbh_url.startswith('http://') or sbh_url.startswith('https://')):
        params_from_request['sbh_url'] = 'https://' + sbh_url

    required_params = ['sbh_url', 'sbh_token', 'sbh_user', 'sbh_pass',
                       'collection_url', 'sbh_overwrite']

    for param in required_params:
        if param not in params_from_request:
            return 'Parameter ' + param + ' not found in request', 400
    if (params_from_request['sbh_token'] is None and 
        params_from_request['sbh_user'] is None and
        params_from_request['sbh_pass'] is None):
        return 'No SBH credentials provided', 400
    
    fj_url = params_from_request.get('fj_url')
    fj_token = params_from_request.get('fj_token')
    fj_user = params_from_request.get('fj_user')
    fj_pass = params_from_request.get('fj_pass')
    fj_overwrite = params_from_request.get('fj_overwrite', 1)

    if not fj_url:
        fj_url = None
        fj_token = None
        fj_user = None
        fj_pass = None
    elif not fj_token and not (fj_user and fj_pass):
        return jsonify({
            "error": "Flapjack URL was provided, but no Flapjack credentials were provided"
        }), 400

    # Attachment files to upload to SBH
    if 'Attachments' in files and 'attachments' in params_from_request:
        attachment_files = files.getlist("Attachments")
        attachments = {}
        for file in attachment_files:
            if file.filename not in params_from_request['attachments']:
                return (
                    f"Attachment metadata for file '{file.filename}' not found in request",
                    400,
                )
            attachments[params_from_request['attachments'][file.filename]] = file
    else:
        attachments = None

    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    safe_metadata_filename = secure_filename(metadata_file.filename)

    if safe_metadata_filename == '':
        return 'Invalid Metadata file name', 400

    metadata_path = os.path.join(
        upload_dir,
        f"{uuid4()}_{safe_metadata_filename}"
    )

    metadata_file.save(metadata_path)

    # Plate reader data to upload to FJ
    if 'Plate_Reader_Output' in request.files and 'sheet_name' in params_from_request:
        filenames = [metadata_path]
        for file in files.getlist("Plate_Reader_Output"):
            # TODO - adapt XDE to work with the file object to avoid unneccesary writes
            safe_data_filename = secure_filename(file.filename)
            if safe_data_filename == '':
                return 'Invalid Plate Reader Output file name', 400
            data_path = os.path.join(upload_dir, safe_data_filename)
            file.save(data_path)
            filenames.append(data_path)
        xde = tricahue.XDE()
        xde.run(filenames, params_from_request['sheet_name'], data_cols_offset=2)
        print(filenames)
        for data_filename in filenames[1:]:
            os.remove(data_filename)

    # instantiate the XDC class using the params_from_request dictionary
    try:
        xdc = tricahue.XDC(input_excel_path = metadata_path, attachments=attachments)
        # print(params_from_request['sbh_url'], params_from_request['collection_url'], params_from_request['sbh_overwrite'], params_from_request['sbh_user'],params_from_request['sbh_pass'], params_from_request['sbh_pass'],params_from_request['fj_url'], params_from_request['fj_overwrite'], params_from_request['fj_user'], params_from_request['fj_pass'],params_from_request['fj_token'])
        sbh_url, fj_url = xdc.upload_to_existing_collection(sbh_url = params_from_request['sbh_url'],
                                      collection_url = params_from_request['collection_url'], 
                                      sbh_overwrite = params_from_request['sbh_overwrite'], 
                                      sbh_user = params_from_request['sbh_user'],
                                      sbh_pass = params_from_request['sbh_pass'], 
                                      sbh_token = params_from_request['sbh_token'],
                                      fj_url = fj_url,
                                      fj_overwrite = fj_overwrite, 
                                      fj_user = fj_user, 
                                      fj_pass = fj_pass,
                                      fj_token = fj_token)
    except AttributeError as e:
        os.remove(metadata_path)
        print('Attribute Error: ',str(e))
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        import traceback

        traceback.print_exc()

        return jsonify({
            "error": str(e),
            "type": type(e).__name__,
            "repr": repr(e)
        }), 500
    
    sbs_upload_response_dict ={
        "sbh_url": sbh_url,
        "fj_url": fj_url,
        "status": "success"
    }
    os.remove(metadata_path)
    return jsonify(sbs_upload_response_dict)


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
