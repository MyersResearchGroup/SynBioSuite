from backend.sbs_server import app
from flask import request, jsonify
from .utils import abstract_design_2_plasmids, sbol2build_moclo
import json
import sbol2 as sb2
import sbol2build
import os

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
    
"""@app.route('/upload_transformation', methods=['POST'])    
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
        return jsonify({"error": f"Unexpected server error: {str(e)}"}), 500"""

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