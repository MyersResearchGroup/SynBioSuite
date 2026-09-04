import sbol2
import sbol2.model
from .utils import sbh_get_subCollection_uris, sbh_get_attachment_uri
import requests
import os

def upload_sbh_attachments(sbh_url, sbh_prefix, sbh_token, sbh_user, sbh_user_graph, sbh_collection_url, attachments, experimentId=None):
        headers = {'Accept': 'text/plain', 'X-authorization': sbh_token}

        for attachment_name, file in attachments.items():
            if isinstance(attachment_name, str):
                resolved_name = attachment_name
            else:
                resolved_name = str(attachment_name)
            search_result = sbh_get_attachment_uri(sbh_url, sbh_token, sbh_user_graph, sbh_collection_url, resolved_name)
            for binding in search_result["results"]["bindings"]:
                uri = binding["s"]["value"]
                if sbh_prefix:
                    uri = uri.replace(sbh_prefix,sbh_url)
                response = requests.get(f'{uri}/remove', headers=headers)
                if not response.ok:
                    raise Exception(f"Deleting existing attachment failed ({response.status_code}): {response.text}")

            if isinstance(file, str):
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
            else:
                filename = getattr(file, 'filename', None) or getattr(file, 'name', None) or resolved_name
                fobj = getattr(file, 'stream', None) or getattr(file, 'file', None) or file
                upload_file = {'file': (filename, fobj)}
                collectionID = sbh_collection_url.split("/")[-3]
                collectionDisplayId = collectionID + "_collection"
                if experimentId is not None:
                    collectionDisplayId = experimentId
                collectionVersion = sbh_collection_url.split("/")[-1]
                response = requests.post(f'{sbh_url}/user/{sbh_user}/{collectionID}/{collectionDisplayId}/{collectionVersion}/attach', headers=headers, files=upload_file)
                if not response.ok:
                    raise Exception(f"Uploading attachments to SynBioHub failed ({response.status_code}): {response.text}")

def upload_to_sbh(doc, sbh_url, sbh_prefix, sbh_token, usergraph, sbh_collection_url, importType, file_path_out_final, sbh_overwrite_num):
    subCollection = sbol2.Collection(importType)
    parts = sbh_collection_url.split("/")
    subCollection_url = "/".join(parts[:6]) + "/" + importType + "/1"
    search_result = sbh_get_subCollection_uris(sbh_url, sbh_token, usergraph, subCollection_url)
    for binding in search_result["results"]["bindings"]:
        uri = binding["s"]["value"]
        subCollection.members = subCollection.members + [ uri ]
    for tl in doc:
        if not tl.identity.startswith(sbh_prefix):
            subCollection.members = subCollection.members + [tl.identity]
    doc.addCollection(subCollection)
    doc.write(file_path_out_final)
    with open(file_path_out_final, 'rb') as fobj:
        response = requests.post(
            f'{sbh_url}/submit',
            headers={
                'Accept': 'text/plain',
                'X-authorization': sbh_token
            },
            files={
                'files': fobj,
            },
            data={
                'rootCollections': sbh_collection_url,
                'overwrite_merge': sbh_overwrite_num
            },
        )
    if not response.ok:
        raise Exception(f"SynBioHub submit failed ({response.status_code}): {response.text}")
    return subCollection_url
