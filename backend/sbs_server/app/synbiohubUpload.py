import sbol2
import sbol2.model
from .utils import sbh_get_subCollection_uris, make_identifier
import requests
import os
import json
from werkzeug.utils import secure_filename
from uuid import uuid4
from flask import jsonify
from . import xdc

def upload_sbh_attachments(sbh_token, sbh_collection_url, file, importType, collection_url, experimentId):
    print("uploading attachments")
 
#    version = '1'
 
#    parts = sbh_collection_url.split("/")
#    subCollection_url = "/".join(parts[:6]) + "/" + importType + "/1"
#    search_result = self.sbh_get_attachment_uri(self.sbh_url,self.sbh_token,self.sbh_collection_url,attachment_name)
    # for binding in search_result["results"]["bindings"]:
    #     uri = binding["s"]["value"]
    #     print(f"Deleting existing attachment {uri}")
    #     response = requests.get(f'{uri}/remove', headers=headers)
    #     if not response.ok:
    #         raise Exception(f"Deleting existing attachment failed ({response.status_code}): {response.text}")
    headers = {'Accept': 'text/plain', 'X-authorization': sbh_token}
    response = requests.post(f'{collection_url}/attach', headers=headers, files=file)
    if not response.ok:
        raise Exception(f"Uploading attachments to SynBioHub failed ({response.status_code}): {response.text}")
    print(f'Uploaded attachment {upload_file["file"][0]}: {response.status_code}')

'''
Helper function to upload SBOL to SynBioHub
'''
def sbh_upload(files):
    if 'SBOL' in files:
        sbol_file = files['SBOL']
        sbml_file = None
    elif 'SBML' in files:
        sbml_file = files['SBML']
        sbol_file = None
    else:
        return 'No file part', 400
 
    if sbol_file and sbol_file.filename != '':
        root, extension = os.path.splitext(sbol_file.filename)
    elif sbml_file and sbml_file.filename != '':
        root, extension = os.path.splitext(sbml_file.filename)
    else:
        return 'No selected file', 400
    if not extension == '.xml':
        return 'Invalid file format', 400

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

    required_params = ['sbh_url', 'sbh_token', 'collection_url', 'sbh_overwrite']

    for param in required_params:
        if param not in params_from_request:
            return 'Parameter ' + param + ' not found in request', 400
    if (params_from_request['sbh_token'] is None):
        return 'No SBH credentials provided', 400
    sbh_url = params_from_request['sbh_url']
    sbh_collection_url = params_from_request['collection_url'] 
    sbh_overwrite = params_from_request['sbh_overwrite'] 
    sbh_token = params_from_request['sbh_token']
    importType = params_from_request['importType']
    parts = sbh_collection_url.split("/")
    usergraph = "/".join(parts[:5])
    subCollection_url = "/".join(parts[:6]) + "/" + importType + "/1"

    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    if sbol_file and sbol_file.filename != '':
        safe_sbol_filename = secure_filename(sbol_file.filename)
        if safe_sbol_filename == '':
            return 'Invalid SBOL file name', 400
        sbol_path = os.path.join(
            upload_dir,
            f"{uuid4()}_{safe_sbol_filename}"
        )
        sbol_out_path = os.path.join(
            upload_dir,
            f"{uuid4()}_out_{safe_sbol_filename}"
        )
        sbml_path = None
    else:
        safe_sbml_filename = secure_filename(sbml_file.filename)
        if safe_sbml_filename == '':
            return 'Invalid SBML file name', 400
        sbml_path = os.path.join(
            upload_dir,
            f"{uuid4()}_{safe_sbml_filename}"
        )
        sbol_out_path = os.path.join(
            upload_dir,
            f"{uuid4()}_out_{safe_sbml_filename}"
        )
        sbol_path = None

    try:
        if sbol_file and sbol_file.filename != '':
            sbol_file.save(sbol_path)
        else:
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
        if sbol_file and sbol_file.filename != '':
            doc.read(sbol_path)
        else:
            with open(sbml_path, "rb") as fobj:
                response = requests.post(
                    f"{subCollection_url}/attach",
                    headers={
                        "Accept": "text/plain",
                        "X-authorization": sbh_token,
                    },
                    files={
                        "file": (os.path.basename(sbml_path), fobj),
                    },
                )

                if not response.ok:
                    raise Exception(
                        f"Uploading attachment to SynBioHub failed "
                        f"({response.status_code}): {response.text}"
                    )

                print(
                    f"Uploaded attachment {os.path.basename(sbml_path)} "
                    f"({response.status_code})"
                )
                #print(f"{subCollection_url}/attach")
                #print(response)
                #display_id = make_identifier(sbml_file.filename)
                #model = sbol2.model.Model(uri=display_id)
                #model.source = sbml_file.filename
                #model.language = "http://identifiers.org/edam/format_2585"
                #model.framework = "http://identifiers.org/biomodels.sbo/SBO:0000062"
                #doc.addModel(model)
        subCollection = sbol2.Collection(importType)
        search_result = sbh_get_subCollection_uris(sbh_url,sbh_token,usergraph,subCollection_url)
        for binding in search_result["results"]["bindings"]:
            uri = binding["s"]["value"]
            subCollection.members = subCollection.members + [ uri ]
        for tl in doc:
            subCollection.members = subCollection.members + [ tl.identity ]
        doc.addCollection(subCollection)
        doc.write(sbol_out_path)
        #print(doc.writeString())

        print("uploading to SBH")
        with open(sbol_out_path, "rb") as f:
            response = requests.post(
                f"{sbh_url}/submit",
                headers={"Accept": "text/plain",
                         "X-authorization": sbh_token,
                },
                files={
                    "files": f,
                },
                data={
                    "rootCollections": sbh_collection_url,
                    "overwrite_merge": sbh_overwrite,
                },
            )
        if not response.ok:
            raise Exception(
                f"SynBioHub submit failed ({response.status_code}): {response.text}"
            )
        return sbh_collection_url
    except AttributeError as e:
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
    finally:
        if sbol_path is not None and os.path.exists(sbol_path):
            for path in (sbol_path, sbol_out_path):
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception as cleanup_error:
                    print(f"Warning: failed to remove temporary file {path}: {cleanup_error}")
        elif sbml_path is not None and os.path.exists(sbml_path):
            for path in (sbml_path, sbol_out_path):
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception as cleanup_error:
                    print(f"Warning: failed to remove temporary file {path}: {cleanup_error}")


'''
Helper function to upload to SynBioHub and Flapjack using XDC/XDE
'''
def sbh_fj_upload(files):
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

    required_params = ['sbh_url', 'sbh_token', 'fj_url', 'fj_token', 'collection_url', 'fj_study_id', 
                        'sbh_overwrite', 'fj_overwrite', 'importType']

    for param in required_params:
        if param not in params_from_request:
            return 'Parameter ' + param + ' not found in request', 400

    sbh_url = params_from_request.get('sbh_url')
    sbh_token = params_from_request.get('sbh_token')
    sbh_overwrite = params_from_request.get('sbh_overwrite', 1)
    collection_url = params_from_request.get('collection_url')    
    fj_url = params_from_request.get('fj_url')
    fj_token = params_from_request.get('fj_token')
    fj_overwrite = params_from_request.get('fj_overwrite', 1)
    fj_study_id = params_from_request.get('fj_study_id')
    importType = params_from_request.get('importType')

    if (params_from_request['sbh_token'] is None):
        return 'No SynBioHub credentials provided', 400

    if not fj_url:
        fj_url = None
        fj_token = None
    elif not fj_token:
        return "Flapjack URL was provided, but no Flapjack credentials were provided", 400
    
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

    # Plate reader data to upload to FJ
    if 'Plate_Reader_Output' in files and 'plateReaderOutputs' in params_from_request:
        plate_reader_files = files.getlist("Plate_Reader_Output")
        plate_reader_attachments = {}
        for file in plate_reader_files:
            if file.filename not in params_from_request['plateReaderOutputs']:
                return (
                    f"Plate Reader Output metadata for file '{file.filename}' not found in request",
                    400,
                )
            plate_reader_attachments[params_from_request['plateReaderOutputs'][file.filename]] = file
    else:
        plate_reader_attachments = None

    # instantiate the XDC class using the params_from_request dictionary
    try:
        xdcObj = xdc.XDC(input_excel_path = metadata_path, attachments=attachments, plate_reader_attachments=plate_reader_attachments)  
        sbh_url, fj_url = xdcObj.upload_to_existing_collection(
                            sbh_url, sbh_token, collection_url, sbh_overwrite, 
                            fj_url, fj_token, fj_study_id, fj_overwrite, importType)

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