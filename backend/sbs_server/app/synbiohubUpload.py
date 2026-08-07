import sbol2
import sbol2.model
from .utils import sbh_get_subCollection_uris, make_identifier, sbh_get_attachment_uri, get_sbh_user
import requests
import os
from uuid import uuid4

def upload_sbh_attachments(sbh_url, sbh_token, sbh_user, sbh_user_graph, sbh_collection_url, attachments, experimentId=None):
        print(f"Uploading attachments to SynBioHub collection: {sbh_collection_url}")
        print(f"Attachments: {attachments}")
        print(f"Experiment ID: {experimentId}")
        print(f"User: {sbh_user}, User Graph: {sbh_user_graph}")
        print(f"SynBioHub URL: {sbh_url}, Token: {sbh_token[:4]}... (truncated for security)")
        print("uploading attachments")
        headers = {'Accept': 'text/plain', 'X-authorization': sbh_token}

        for attachment_name, file in attachments.items():
            print(f"Processing attachment: {attachment_name}")
            print(f"Attachment object: {file}")

            if isinstance(attachment_name, str):
                resolved_name = attachment_name
            else:
                resolved_name = str(attachment_name)

            print(f"Attachment name: {resolved_name}")
            search_result = sbh_get_attachment_uri(sbh_url, sbh_token, sbh_user_graph, sbh_collection_url, resolved_name)
            print(f"Existing attachment search result for '{resolved_name}': {search_result}")
            for binding in search_result["results"]["bindings"]:
                uri = binding["s"]["value"]
                print(f"Deleting existing attachment {uri}")
                response = requests.get(f'{uri}/remove', headers=headers)
                if not response.ok:
                    raise Exception(f"Deleting existing attachment failed ({response.status_code}): {response.text}")

            if isinstance(file, str):
                print(f"Uploading file from path: {file}")
                with open(file, 'rb') as fobj:
                    upload_file = {'file': (os.path.basename(file), fobj)}
                    collectionID = sbh_collection_url.split("/")[-3]
                    collectionDisplayId = collectionID + "_collection"
                    if experimentId is not None:
                        collectionDisplayId = experimentId
                    collectionVersion = sbh_collection_url.split("/")[-1]
                    response = requests.post(f'{sbh_url}/user/{sbh_user}/{collectionID}/{collectionDisplayId}/{collectionVersion}/attach', headers=headers, files=upload_file)
                    if not response.ok:
                        raise Exception(f"Uploading attachments to SynBioHub failed ({response.status_code}): {response.text}")
                    print(f'Uploaded attachment {upload_file["file"][0]}: {response.status_code}')
            else:
                print(f"Uploading file-like object: {file}")
                filename = getattr(file, 'filename', None) or getattr(file, 'name', None) or resolved_name
                print(f"Using filename: {filename}")
                fobj = getattr(file, 'stream', None) or getattr(file, 'file', None) or file
                print(f"Using file object: {fobj}")
                upload_file = {'file': (filename, fobj)}
                print(f"Prepared upload file: {upload_file}")
                collectionID = sbh_collection_url.split("/")[-3]
                print(f"Collection ID: {collectionID}")
                collectionDisplayId = collectionID + "_collection"
                print(f"Collection Display ID: {collectionDisplayId}")
                if experimentId is not None:
                    collectionDisplayId = experimentId
                    print(f"Using Experiment ID for Collection Display ID: {collectionDisplayId}")
                collectionVersion = sbh_collection_url.split("/")[-1]
                print(f"Collection Version: {collectionVersion}")
                response = requests.post(f'{sbh_url}/user/{sbh_user}/{collectionID}/{collectionDisplayId}/{collectionVersion}/attach', headers=headers, files=upload_file)
                if not response.ok:
                    raise Exception(f"Uploading attachments to SynBioHub failed ({response.status_code}): {response.text}")
                print(f'Uploaded attachment {upload_file["file"][0]}: {response.status_code}')

def upload_to_sbh(doc, sbh_url, sbh_token, usergraph, sbh_collection_url, importType, file_path_out_final, sbh_overwrite_num):
    print('uploading to SBH')
    subCollection = sbol2.Collection(importType)
    parts = sbh_collection_url.split("/")
    subCollection_url = "/".join(parts[:6]) + "/" + importType + "/1"
    search_result = sbh_get_subCollection_uris(sbh_url, sbh_token, usergraph, subCollection_url)
    for binding in search_result["results"]["bindings"]:
        uri = binding["s"]["value"]
        subCollection.members = subCollection.members + [ uri ]
    for tl in doc:
        subCollection.members = subCollection.members + [ tl.identity ]
    doc.addCollection(subCollection)
    doc.write(file_path_out_final)
    response =  requests.post(
        f'{sbh_url}/submit',
        headers={
            'Accept': 'text/plain',
            'X-authorization': sbh_token
        },
        files={
            'files': open(file_path_out_final,'rb'),
        },
        data={
            'rootCollections' : sbh_collection_url,
            'overwrite_merge' : sbh_overwrite_num
        },
    )
    if not response.ok:
        raise Exception(f"SynBioHub submit failed ({response.status_code}): {response.text}")
    return sbh_collection_url
