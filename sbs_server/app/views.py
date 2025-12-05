from __future__ import annotations 
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from .main import app
from .utils import abstract_design_2_plasmids, sbol2build_moclo, generate_transformation_metadata
import sys
import os
import json

import tricahue
import sbol2
import pudu

#routes
#check if the app is running
@app.route('/api/status')
def pin():
    return jsonify({"status": "working"}), 200

@app.route("/api/data")
def get_data():
    return app.send_static_file("data.json")

@app.route('/api/upload_sbs', methods = ['POST'])
def upload_file_from_sbs_post():
    if 'Metadata' not in request.files:
        print(request)
        return 'No file part', 400
    file = request.files['Metadata']
    if file.filename == '':
        return 'No selected file', 400
    file_contents = file.read()
    if 'Params' not in request.files:
        return 'No Params file part', 400
    params_file = request.files['Params']
    if params_file.filename == '':
        return 'No selected Params file', 400
    params_from_request = json.loads(params_file.read())
    expected_params = ['fj_url', 'fj_token', 'sbh_url', 'sbh_token', 'sbh_collec', 'sbh_collec_desc', 'sbh_overwrite', 'fj_overwrite']
    for param in expected_params:
        if param not in params_from_request:
            return 'Parameter ' + param + ' not found in request', 400

    # instantiate the XDC class using the params_from_request dictionary
    print(request.files['Metadata'])
    xdc = tricahue.XDC(input_excel_path = request.files['Metadata'],
            fj_url = params_from_request['fj_url'],
            fj_user = None, 
            fj_pass = None, 
            sbh_url = params_from_request['sbh_url'], 
            sbh_user = None, 
            sbh_pass = None, 
            sbh_collection = params_from_request['sbh_collec'], 
            sbh_collection_description = params_from_request['sbh_collec_desc'],
            sbh_overwrite = params_from_request['sbh_overwrite'], 
            fj_overwrite = params_from_request['fj_overwrite'], 
            fj_token = params_from_request['fj_token'], 
            sbh_token = params_from_request['sbh_token'],
            homespace = "https://synbiohub.org/gonza10v"
            )

    try:
        xdc.initialize()
        xdc.log_in_sbh()
        xdc.log_in_fj()
        xdc.convert_to_sbol()
        xdc.generate_sbol_hash_map()
        sbh_url = xdc.upload_to_sbh()
        xdc.upload_to_fj()
    except AttributeError as e:
        return jsonify({"error": str(e)}), 400

    sbs_upload_response_dict ={
        "sbh_url": sbh_url,
        "status": "success"
    }
    return jsonify(sbs_upload_response_dict)

@app.route('/api/upload_sbs_up', methods = ['POST'])
def upload_file_from_sbs_post_up():
    if 'Metadata' not in request.files:
        print(request)
        return 'No file part', 400
    file = request.files['Metadata']
    if file.filename == '':
        return 'No selected file', 400
    file_contents = file.read()
    if 'Params' not in request.files:
        return 'No Params file part', 400
    params_file = request.files['Params']
    if params_file.filename == '':
        return 'No selected Params file', 400
    params_from_request = json.loads(params_file.read())
    expected_params = ['fj_url', 'fj_user', 'fj_pass', 'sbh_url', 'sbh_user', 'sbh_pass', 'sbh_collec', 'sbh_collec_desc', 'sbh_overwrite', 'fj_overwrite']
    for param in expected_params:
        if param not in params_from_request:
            return 'Parameter ' + param + ' not found in request', 400

    # instantiate the XDC class using the params_from_request dictionary
    print(request.files['Metadata'])
    xdc = tricahue.XDC(input_excel_path = request.files['Metadata'],
            fj_url = params_from_request['fj_url'],
            fj_user = params_from_request['fj_user'],
            fj_pass = params_from_request['fj_pass'], 
            sbh_url = params_from_request['sbh_url'], 
            sbh_user = params_from_request['sbh_user'], 
            sbh_pass = params_from_request['sbh_pass'],
            sbh_collection = params_from_request['sbh_collec'], 
            sbh_collection_description = params_from_request['sbh_collec_desc'],
            sbh_overwrite = params_from_request['sbh_overwrite'], 
            fj_overwrite = params_from_request['fj_overwrite'], 
            fj_token = None, 
            sbh_token = None,
            homespace = "https://synbiohub.org/gonza10v"
            )            

    try:
        xdc.initialize()
        xdc.log_in_fj()
        xdc.log_in_sbh()
        xdc.convert_to_sbol()
        xdc.generate_sbol_hash_map()
        sbh_url = xdc.upload_to_sbh()
        xdc.upload_to_fj()
    except AttributeError as e:
        return jsonify({"error": str(e)}), 400
    
    sbs_upload_response_dict = {
        "sbh_url": sbh_url,
        "status": "success"
    }
    return jsonify(sbs_upload_response_dict)

@app.route('/upload_assembly', methods=['POST'])    
def upload_assembly():
    if 'auth_token' not in request.form:
        return jsonify({"error": "Missing SynBioHub Authentication Token"}), 400
    if 'registry_url' not in request.form:
        return jsonify({"error": "Missing SynBioHub Registry URL"}), 400
    if 'collection_uri' not in request.form:
        return jsonify({"error": "Missing recipient SynBioHub collection URI"}), 400

    if 'abstract_design_uri' not in request.form:
        return jsonify({"error": "Missing abstract design URI"}), 400
    if 'plasmid_collection_uri' not in request.form:
        return jsonify({"error": "Missing plasmid collection URI"}), 400
    if 'plasmid_vector_uri' not in request.form:
        return jsonify({"error": "Missing plasmid vector URI"}), 400
    if 'assembly_protocol' not in request.form:
        return jsonify({"error": "Missing assembly protocol type"}), 400

    auth_token = request.form.get("auth_token")
    sbh_registry = request.form.get("registry_url")
    recipient_collection_uri = request.form.get("collection_uri")
    abstract_design_uri = request.form.get("abstract_design_uri")
    plasmid_collection_uri = request.form.get("plasmid_collection_uri")
    plasmid_vector_uri = request.form.get("plasmid_vector_uri")

    sbh = sbol2.PartShop(sbh_registry)
    sbh.key = auth_token
    
    try:
        # Run abstract translator to get plasmids
        plasmid_documents, vector_doc, design_id = abstract_design_2_plasmids(abstract_design_uri, plasmid_collection_uri, plasmid_vector_uri, sbh)
        
        # Run plasmids through sbol2build to generate assembly plan
        assembly_plan_doc = sbol2build_moclo(plasmid_documents, vector_doc, design_id)
        assembly_plan_doc.displayId = f"{design_id}_assembly"

    
        sbh_response = sbh.submit(
            doc=assembly_plan_doc,
            collection=recipient_collection_uri,
            overwrite=2
        )
        return sbh_response.text, sbh_response.status_code

    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    except Exception as e:
        return jsonify({"error": f"Unexpected server error: {str(e)}"}), 500
    
@app.route('/upload_transformation', methods=['POST'])    
def upload_transformation():
    if 'auth_token' not in request.form:
        return jsonify({"error": "Missing SynBioHub Authentication Token"}), 400
    if 'registry_url' not in request.form:
        return jsonify({"error": "Missing SynBioHub Registry URL"}), 400
    if 'collection_uri' not in request.form:
        return jsonify({"error": "Missing recipient SynBioHub collection URI"}), 400

    if 'plasmid_uris' not in request.form:
        return jsonify({"error": "Missing plasmid URIs"}), 400
    if 'chassis_uri' not in request.form:
        return jsonify({"error": "Missing chassis URI"}), 400
    if 'machine' not in request.form:
        return jsonify({"error": "Missing machine"}), 400
    if 'protocol' not in request.form:
        return jsonify({"error": "Missing protocol"}), 400
    if 'params' not in request.form:
        return jsonify({"error": "Missing trasnformation parameters"}), 400

    auth_token = request.form.get("auth_token")
    sbh_registry = request.form.get("registry_url")
    recipient_collection_uri = request.form.get("collection_uri")

    plasmid_uris = request.form.get("plasmid_uris")
    chassis_uri = request.form.get("chassis_uri")
    machine_name = request.form.get("machine")
    protocol = request.form.get("protocol")
    parameters = request.form.get("params")

    sbh = sbol2.PartShop(sbh_registry)
    sbh.key = auth_token
    
    try:
        transformation_doc = generate_transformation_metadata(plasmid_uris, chassis_uri, machine_name, protocol, parameters, sbh)

        sbh_response = sbh.submit(
            doc=transformation_doc,
            collection=recipient_collection_uri,
            overwrite=2
        )
        return sbh_response.text, sbh_response.status_code

    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    except Exception as e:
        return jsonify({"error": f"Unexpected server error: {str(e)}"}), 500

@app.route('/build_pudu', methods=['POST'])
def build_pudu():
    # Error checking in the request
    print("request", request.files)

    if 'assembly_plan' not in request.files:
        return jsonify({"error": "Missing assembly plan"}), 400
    if 'wizard_selections' not in request.form:
        return jsonify({"error": "Missing wizard selections"}), 400

    wizard_selection = request.form.get('wizard_selections')
    assembly_plan_file = request.files.get('assembly_plan')

    # # Parse the json
    wizard_selection_json = json.loads(wizard_selection)
    build_method = wizard_selection_json.get('formValues').get('buildMethod')

    # Check if the assembly method is valid
    if build_method != 'PUDU':
        return jsonify({"error": "Invalid build method"}), 400
    
    # Get the assembly, is in text [?] and read using SBOL
    # transform assembly plan in text to a SBOL document, similar to the example following

    # part_docs = []
    # for item in insert_parts:
    #     doc = sbol2.Document()
    #     doc.read(item)
    #     part_docs.append(doc)

    try:
        assembly_plan = assembly_plan_file.read().decode('utf-8')
        assembly_plan_doc = sbol2.Document()
        assembly_plan_doc.readString(assembly_plan)
    except Exception as e:
        return jsonify({"error": f"Error parsing file: {str(e)}"}), 400

    try:
        # TODO: AssemblyToJSON - using PUDU function

        # TODO: Run script (which has opentrons script hardcoded) using JSON file

        return jsonify({"message": "PUDU build not implemented yet"}), 501
    
    except ValueError as e:
        # catch errors and return to frontend
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected server error: {str(e)}"}), 500


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

