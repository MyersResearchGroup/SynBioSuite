from __future__ import annotations
import os
import traceback
from flask import request, jsonify
import json
import requests
from werkzeug.utils import secure_filename
from uuid import uuid4
from flask import jsonify
import sbol2
import sbol2.model

from .main import app
from .version import __version__
from .downloadTemplates import sbh_download_template
from .synbiohubUpload import upload_sbh_attachments, upload_to_sbh
from .utils import get_sbh_user, convert_to_sbol, make_identifier, sbh_get_attachment_uri, find_root_module_definitions

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
    return sbol_upload(request.files)

@app.route('/api/uploadResource', methods = ['POST'])
def upload_resource():
    return xdc_run(request.files)

@app.route('/api/uploadExperiment', methods = ['POST'])
def upload_experiment():
    return xdc_run(request.files)

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

'''
Experimental Data Converter (XDC) for conversion of experimental data from Excel to SBOL and upload to SynBioHub and Flapjack.
'''
def xdc_run(files):

    print("Starting XDC run")

    # Check metadata file from frontend
    if 'Metadata' not in files:
        return jsonify({"error": "No file part"}), 400
    metadata_file = files['Metadata']
    filename = (metadata_file.filename or "").strip()
    if not filename:
        return jsonify({"error": "No Metadata file"}), 400
    extension = os.path.splitext(filename)[1].lower()
    if not extension == '.xlsx' and not extension == '.xlsm':
        return jsonify({"error": "Invalid Metadata file format"}), 400

    # Check params from frontend
    if 'Params' not in files:
        return jsonify({"error": "No Params file part"}), 400
    params_file = files['Params']
    if params_file.filename == '':
        return jsonify({"error": "No selected Params file"}), 400
    params_from_request = json.loads(params_file.read())

    required_params = ['sbh_url', 'sbh_prefix', 'sbh_token', 'fj_url', 'fj_token', 'collection_url', 'fj_study_id', 
                        'sbh_overwrite', 'fj_overwrite', 'importType']

    for param in required_params:
        if param not in params_from_request:
            return jsonify({"error": f"Parameter {param} not found in request"}), 400

    sbh_url = params_from_request.get('sbh_url')
    sbh_prefix = params_from_request.get('sbh_prefix')
    sbh_token = params_from_request.get('sbh_token')
    sbh_overwrite_num = 3 if params_from_request.get('sbh_overwrite', 1) else 2
    sbh_collection_url = params_from_request.get('collection_url')    
    fj_url = params_from_request.get('fj_url')
    fj_token = params_from_request.get('fj_token')
    fj_refresh_token = params_from_request.get('fj_refresh_token')
    fj_overwrite = params_from_request.get('fj_overwrite', 1)
    fj_study_id = params_from_request.get('fj_study_id')
    importType = params_from_request.get('importType')

    if (params_from_request['sbh_token'] is None):
        return jsonify({"error": "No SynBioHub credentials provided"}), 400

    if fj_url and not fj_token:
        return jsonify({"error": "Flapjack URL was provided, but no Flapjack credentials were provided"}), 400

    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    safe_metadata_filename = secure_filename(metadata_file.filename)

    if safe_metadata_filename == '':
        return jsonify({"error": "Invalid Metadata file name"}), 400

    metadata_path = os.path.join(
        upload_dir,
        f"{uuid4()}_{safe_metadata_filename}"
    )

    metadata_file.save(metadata_path)

    # Attachment files to upload to SBH
    if 'Attachments' in files and 'attachments' in params_from_request:
        attachment_files = files.getlist("Attachments")
        attachments = {}
        for file in attachment_files:
            if file.filename not in params_from_request['attachments']:
                return jsonify({"error": f"Attachment metadata for file '{file.filename}' not found in request"}), 400
            attachments[params_from_request['attachments'][file.filename]] = file
    else:
        attachments = None

    # Plate reader data to upload to FJ
    if 'Plate_Reader_Output' in files and 'plateReaderOutputs' in params_from_request:
        plate_reader_files = files.getlist("Plate_Reader_Output")
        plate_reader_attachments = {}
        for file in plate_reader_files:
            if file.filename not in params_from_request['plateReaderOutputs']:
                return jsonify({"error": f"Plate Reader Output metadata for file '{file.filename}' not found in request"}), 400
            plate_reader_attachments[params_from_request['plateReaderOutputs'][file.filename]] = file
    else:
        plate_reader_attachments = None

    try:
        file_path_out = f"{uuid4()}_converted_SBOL.xml"
        sbol_doc = convert_to_sbol(metadata_path, file_path_out, 'https://example.org/')
    except Exception as e:
        return jsonify({"error": "SBOL Conversion Failed: " + str(e)}), 400

    if not sbh_token:
        print('Unable to login to SynBioHub')
        return jsonify({"error": "Unable to login to SynBioHub"}), 400

    try:
        sbh_user_info = get_sbh_user(sbh_url, sbh_token)
        sbh_user = sbh_user_info['user']
        sbol_graph_uri = sbh_user_info['graph']
    except Exception as e:
        print('Error logging into SynBioHub')
        return jsonify({"error": f"Error logging into SynBioHub: {e}"}), 400

    try:
        file_path_out_final = f"{uuid4()}_SBOL_final.xml"
        upload_to_sbh(sbol_doc, sbh_url, sbh_token, sbol_graph_uri, sbh_collection_url, importType, file_path_out_final, sbh_overwrite_num)
    except Exception as e:
        print('Error uploading to SynBioHub')
        return jsonify({"error": f"Error uploading to SynBioHub: {e}"}), 400

    if attachments is not None:
        try:
            experimentId = None
            for tl in sbol_doc:
                if isinstance(tl, sbol2.Experiment):
                    experimentId = tl.displayId
                    break
            upload_sbh_attachments(sbh_url, sbh_prefix, sbh_token, sbh_user, sbol_graph_uri, sbh_collection_url, attachments, experimentId)
        except Exception as e:
            print('Error uploading attachments to SynBioHub')
            return jsonify({"error": f"Error uploading attachments to SynBioHub: {e}"}), 400

    if fj_study_id is not None and fj_url is not None and fj_token is not None and plate_reader_attachments:
        try:
            from . import uploadFlapjack as fj_import

            if fj_url=="http://localhost:8000":
                fj_url = "http://flapjack2-api-1:8000"

            # SynBioHub client (token) + Flapjack client (access token only)
            shop = fj_import.get_sbh_client(token=sbh_token, url=sbh_url, prefix=sbh_prefix)
            flapjack = fj_import.get_flapjack_client(
                access_token=fj_token, refresh_token=fj_refresh_token, url=fj_url.split('://')[-1])

            # plate_reader_attachments is {name: file object}; save each for the reader
            plate_paths = []
            for pr_file in plate_reader_attachments.values():
                pr_path = os.path.join(upload_dir, f"{uuid4()}_{secure_filename(pr_file.filename)}")
                pr_file.save(pr_path)
                plate_paths.append(pr_path)

            # one plate file per populated assay (in order), uploaded into the SBS study
            for (assay_id, assay_name, temperature), plate in zip(
                    fj_import.read_assays(metadata_path), plate_paths):
                template_out = os.path.join(upload_dir, f"{uuid4()}_flapjack_input.xlsx")
                fj_import.import_study(
                    shop, flapjack, metadata_path, plate,
                    int(fj_study_id), assay_name, template_out,
                    assay_id=assay_id, temperature=temperature or 37)
                os.remove(template_out)

            for plate in plate_paths:
                try:
                    os.remove(plate)
                except OSError:
                    # Don't fail the whole process if we can't delete a temporary file; just log it
                    print(f"Warning: failed to remove temporary plate file {plate}")
                    pass
        except Exception as e:
            traceback.print_exc()
            print('Error uploading to Flapjack')
            return jsonify({"error": f"Error uploading to Flapjack: {e}"}), 400

    print("XDC run complete")
    
    sbs_upload_response_dict ={
        "sbh_url": sbh_url,
        "fj_url": fj_url,
        "status": "success"
    }
    os.remove(metadata_path)
    return jsonify(sbs_upload_response_dict)


'''
Helper function to upload SBOL to SynBioHub
'''
def sbol_upload(files):
    if 'SBOL' in files:
        sbol_file = files['SBOL']
    else:
        return jsonify({"error": "No SBOL file provided"}), 400
    if 'SBML' in files:
        sbml_file = files['SBML']
    else:
        sbml_file = None

    if sbol_file and sbol_file.filename != '':
        root, extension = os.path.splitext(sbol_file.filename)
    else:
        return jsonify({"error": "No selected file"}), 400
    if not extension == '.xml':
        return jsonify({"error": "Invalid file format"}), 400
    if sbml_file and sbml_file.filename != '':
        sbmlRoot, sbmlExtension = os.path.splitext(sbml_file.filename)

    # Check params from frontend
    if 'Params' not in files:
        return jsonify({"error": "No Params file part"}), 400
    params_file = files['Params']
    if params_file.filename == '':
        return jsonify({"error": "No selected Params file"}), 400
    params_from_request = json.loads(params_file.read())
    sbh_url = params_from_request.get('sbh_url')
    if sbh_url and not (sbh_url.startswith('http://') or sbh_url.startswith('https://')):
        params_from_request['sbh_url'] = 'https://' + sbh_url

    required_params = ['sbh_url', 'sbh_prefix', 'sbh_token', 'collection_url', 'sbh_overwrite']

    for param in required_params:
        if param not in params_from_request:
            return jsonify({"error": f"Parameter {param} not found in request"}), 400
    if (params_from_request['sbh_token'] is None):
        return jsonify({"error": "No SBH credentials provided"}), 400
    sbh_url = params_from_request['sbh_url']
    sbh_prefix = params_from_request.get('sbh_prefix')
    sbh_collection_url = params_from_request['collection_url'] 
    sbh_overwrite = params_from_request['sbh_overwrite'] 
    sbh_token = params_from_request['sbh_token']
    importType = params_from_request['importType']
    parts = sbh_collection_url.split("/")
    usergraph = "/".join(parts[:5])
    subCollection_url = "/".join(parts[:6]) + "/" + importType + "/1"

    try:
        sbh_user_info = get_sbh_user(sbh_url, sbh_token)
        sbh_user = sbh_user_info['user']
        sbh_graph_uri = sbh_user_info['graph']
    except Exception as e:
        print('Error logging into SynBioHub')
        return jsonify({"error": f"Error logging into SynBioHub: {e}"}), 400

    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    safe_sbol_filename = secure_filename(sbol_file.filename)
    if safe_sbol_filename == '':
        return jsonify({"error": "Invalid SBOL file name"}), 400
    sbol_path = os.path.join(
        upload_dir,
        f"{uuid4()}_{safe_sbol_filename}"
    )
    sbol_out_path = os.path.join(
        upload_dir,
        f"{uuid4()}_out_{safe_sbol_filename}"
    )
    sbml_path = None
    if sbml_file and sbml_file.filename != '':
        safe_sbml_filename = secure_filename(sbml_file.filename)
        if safe_sbml_filename == '':
            return 'Invalid SBML file name', 400
        sbml_path = os.path.join(
            upload_dir,
            f"{uuid4()}_{safe_sbml_filename}"
        )
        sbml_out_path = os.path.join(
            upload_dir,
            f"{uuid4()}_out_{safe_sbml_filename}"
        )

    try:
        sbol_file.save(sbol_path)
        if sbml_file and sbml_file.filename != '':
            sbml_file.save(sbml_path)
        sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
        sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
        homespaces = {
            "Devices": "https://example.com/",
            "Designs": "https://sbolcanvas.org/",
            "Models": "https://sbolcanvas.org/",
            "Plasmids": "https://example.com/",
        }
        sbol2.setHomespace(homespaces.get(importType, "https://synbiosuite.org/"))
        doc = sbol2.Document()
        doc.read(sbol_path)
        if sbml_file and sbml_file.filename != '':
            attachments = {}
            attachments[sbml_file.filename] = sbml_file
            upload_sbh_attachments(sbh_url, sbh_prefix, sbh_token, sbh_user, sbh_graph_uri, sbh_collection_url, attachments)
            search_result = sbh_get_attachment_uri(sbh_url, sbh_token, sbh_graph_uri, sbh_collection_url, sbml_file.filename)
            for binding in search_result["results"]["bindings"]:
                sourceUri = binding["s"]["value"]
            print({sourceUri})
            display_id = make_identifier(sbml_file.filename)
            model = sbol2.model.Model(uri=display_id)
            model.source = sourceUri
            model.language = "http://identifiers.org/edam/format_2585"
            model.framework = "http://identifiers.org/biomodels.sbo/SBO:0000062"
            doc.addModel(model)
            roots = find_root_module_definitions(doc)
            for root in roots:
                print(root.displayId, root.identity)
                root.models = root.models + [model.identity]
        upload_to_sbh(doc, sbh_url, sbh_token, usergraph, sbh_collection_url, importType, sbol_out_path, sbh_overwrite)
    except AttributeError as e:
        print('Attribute Error: ',str(e))
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({
            "error": str(e),
            "type": type(e).__name__,
            "repr": repr(e)
        }), 500
    finally:
        if sbol_path is not None and os.path.exists(sbol_path):
            for path in (sbol_path, sbol_out_path):
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception as cleanup_error:
                    print(f"Warning: failed to remove temporary file {path}: {cleanup_error}")
        if sbml_path is not None and os.path.exists(sbml_path):
            for path in (sbml_path, sbol_out_path):
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception as cleanup_error:
                    print(f"Warning: failed to remove temporary file {path}: {cleanup_error}")
    return jsonify({"message": "SBOL upload successful"}), 200
