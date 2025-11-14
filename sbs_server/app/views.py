from __future__ import annotations 
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from .main import app
import sys
import os
import json
import xml.etree.ElementTree as ET

import sbol2build
import tricahue
import sbol2 as sb2
import pudu
import subprocess

#routes
#check if the app is running
@app.route('/api/status')
def pin():
    return jsonify({"status": "working"}), 200

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

'''
Helper function to upload to SynBioHub and Flapjack using XDC/XDE
'''
def sbh_fj_upload(files):
    
    if 'Metadata' not in files:
        print(request)
        return 'No file part', 400
    metadata_file = files['Metadata']
    if metadata_file.filename == '':
        return 'No selected file', 400
    root, extension = os.path.splitext(metadata_file.filename)
    if not extension == '.xlsx' and not extension == '.xlsm':
        return 'Invalid Metadata file format', 400
    
    # # Plate reader data to upload to FJ
    # if 'Experimental_Data' in request.files:
    #     experimental = request.files['Experimental_Data']
    #     # Run XDE to add data to template (?)
    #     # experimental = result
    # else:
    #     experimental = None

    # Check params from frontend
    if 'Params' not in files:
        return 'No Params file part', 400
    params_file = files['Params']
    if params_file.filename == '':
        return 'No selected Params file', 400
    params_from_request = json.loads(params_file.read())
    required_params = ['sbh_url', 'sbh_token', 'sbh_user', 'sbh_pass', 
                       'fj_url', 'fj_token', 'fj_user', 'fj_pass', 
                       'sbh_collec', 'sbh_collec_desc', 
                       'sbh_overwrite', 'fj_overwrite']
    for param in required_params:
        if param not in params_from_request:
            return 'Parameter ' + param + ' not found in request', 400
    if (params_from_request['sbh_token'] is None and 
        params_from_request['sbh_user'] is None and
        params_from_request['sbh_pass'] is None):
        return 'No SBH credentials provided', 400

    # Attachment files to upload to SBH
    if 'Attachments' in files and 'attachments' in params_from_request:
        attachment_files = files.getlist("Attachments")
        attachments = {params_from_request['attachments'][file.filename] : file for file in attachment_files}
        print(attachments)
    else:
        attachments = None

    # instantiate the XDC class using the params_from_request dictionary
    xdc = tricahue.XDC(input_excel_path = files['Metadata'],
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
            fj_token = params_from_request['fj_token'], 
            sbh_token = params_from_request['sbh_token'],
            homespace = "https://example.org/", 
            attachments = attachments
            )

    try:
        sbh_url = xdc.run()
    except AttributeError as e:
        return jsonify({"error": str(e)}), 400

    sbs_upload_response_dict ={
        "sbh_url": sbh_url,
        "status": "success"
    }
    return jsonify(sbs_upload_response_dict)


@app.route('/sbol_2_build_golden_gate', methods=['POST'])
def sbol_2_build_golden_gate():
    # Error checking in the request
    print("request", request.files)

    if 'plasmid_backbone' not in request.files:
        return jsonify({"error": "Missing plasmid backbone"}), 400
    if 'insert_parts' not in request.files:
        return jsonify({"error": "Missing insert parts"}), 400
    if 'wizard_selections' not in request.form:
        return jsonify({"error": "Missing wizard selections"}), 400

    wizard_selection = request.form.get('wizard_selections')
    plasmid_backbone = request.files.get('plasmid_backbone')
    insert_parts = request.files.getlist('insert_parts')

    # Parse the json

    wizard_selection_json = json.loads(wizard_selection)
    assembly_method = wizard_selection_json.get('formValues').get('assemblyMethod')

    # Check if the assembly method is valid
    if assembly_method != 'MoClo':
        return jsonify({"error": "Invalid assembly method"}), 400
    
    # Get the restriction item
    restriction_enzyme = wizard_selection_json.get('formValues').get('restrictionEnzyme')

    # code for sbol2build
    part_docs = []
    for item in insert_parts:
        doc = sb2.Document()
        doc.read(item)
        part_docs.append(doc)
    
    bb_doc = sb2.Document()
    bb_doc.read(plasmid_backbone)

    assembly_doc = sb2.Document()
    assembly_obj = sbol2build.golden_gate_assembly_plan('testassem', part_docs, bb_doc, restriction_enzyme, assembly_doc)

    try:
        composites = assembly_obj.run()

        return_string = assembly_doc.writeString()

        # Return the file as a response
        return return_string

    except ValueError as e:
        # catch sbol2build errors and return to frontend
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected server error: {str(e)}"}), 500

@app.route('/api/build_pudu', methods=['POST'])
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

    # TODO: save xml to a file ('assembly_plan.xml')

    try:
        # Run script (which has opentrons script hardcoded) using JSON file
        log = subprocess.run(["python", "run_sbol2assembly.py"], capture_output=True).stdout
        curpath = os.path.abspath(os.curdir)
        print(curpath)
        # write captured output to a text file
        # w = write mode, create file if doesn't exist; b = binary file
        with open("files/build_log.txt", "wb") as log_file:
            log_file.write(log)
        # read excel file "sbol2_assembly_output.xlsx"

        # returns: build_log.txt, excel file, py protocol, build plan
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

