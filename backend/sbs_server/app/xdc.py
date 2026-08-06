import excel2sbol
import sbol2
import requests
import os

import pandas as pd
from openpyxl import load_workbook
import numpy as np
import re
import traceback
from urllib.parse import urlencode

class XDC:

    """
    XDC class to upload excel file to SynBioHub and Flapjack.
    ...

    Attributes
    ----------
    input_excel_path : str
        path to the input excel file
    fj_url : str
        URL of the Flapjack instance
    fj_user : str
        username of the Flapjack instance
    fj_pass : str
        password of the Flapjack instance
    sbh_url : str
        URL of the SynBioHub instance
    sbh_user : str
        username of the SynBioHub instance
    sbh_pass : str
        password of the SynBioHub instance
    sbh_collection_name : str
        name of collection to upload the SBOL file to
    sbh_collection_url : str
        url of collection to upload the SBOL file to
    sbh_description : str
        description of the collection
    sbh_overwrite : bool
        whether to overwrite the SBOL file if it already exists
    fj_overwrite : bool
        whether to overwrite the Flapjack project if it already exists  
    fj_token : str
        token to authenticate with Flapjack
    sbh_token : str
        token to authenticate with SynBioHub
    attachments : dict { str : filename or file object}
        other files to upload to SBH

    Methods
    -------
    __init__()
        Initialize, take excel template and convert it to sbol
    upload_to_new_collection()
        Uploads template and attachments to a new SynBioHub collection, and FJ (optional)
        Requires a collection name
    upload_to_existing_collection()
        Uploads template and attachments to an existing SynBioHub collection, and FJ (optional)
        Requires the collection URI
    get_sbol_document()
        Helper method to access the converted SBOL document

    _log_in_fj()
        Logs into Flapjack
    _log_in_sbh()
        Logs into SynBioHub
    _convert_to_sbol()
        Converts the input excel file to SBOL format
    _generate_sbol_hash_map()
        Generates the SBOL object mapping
    _upload_to_fj()
        Uploads the SBOL file to Flapjack
    _upload_to_sbh()
        Uploads the SBOL file to SynBioHub
    _upload_sbh_attachments()
        Upload the attachments to the existing SBH
    _run()
        Runs the XDC process internally

    """
    def __init__(self, input_excel_path, attachments=None, plate_reader_attachments=None, homespace='https://example.org/'):
        self.input_excel_path = input_excel_path
        self.attachments = attachments
        self.plate_reader_attachments = plate_reader_attachments
        self.sbol_doc = sbol2.Document()
        self.sbol_fj_doc = sbol2.Document()
        self.sbol_graph_uri = None
        if isinstance(input_excel_path, str):
            self.sbh_collection_name = re.search(r'[\w-]+?(?=\.)', input_excel_path).group()
        else:
            self.sbh_collection_name = 'New_collection'
        self.file_path_out = f'{self.sbh_collection_name}_converted_SBOL.xml'
        self.file_path_out_FJ = f'{self.sbh_collection_name}_SBOL_Fj_doc.xml'
        self.homespace = homespace
        self.sbol_hash_map = {}

        # Set defaults
        self.fj_url = None
        self.fj_overwrite = False
        self.fj_token = None
        self.fj_study_id = None

        self.sbh_url = None
        self.sbh_token = None
        self.sbh_user = None
        self.sbol_graph_uri = None
        self.sbh_description = None
        self.sbh_overwrite_num = 0
        self.sbh_collection_url = None

        self.upload_url = None
        self.collection_url = None

        self.importType = None
        self.experimentId = None

        try:
            self._convert_to_sbol()
        except Exception as e:
            print('SBOL Conversion Failed')
            raise Exception(f"Error during SBOL conversion: {e}") from e

    def _convert_to_sbol(self, sbol_version=2):
        print("converting to SBOL")
        try:
            sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
            sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
            excel2sbol.converter(file_path_in = self.input_excel_path, 
                    file_path_out = self.file_path_out, homespace=self.homespace, sbol_version=sbol_version)
            doc = sbol2.Document()
            doc.read(self.file_path_out)
            print("conversion complete")
            self.sbol_doc = doc
        except Exception as e:
            print("CONVERSION FAILED --- SEE MESSAGE")
            print(f"{type(e).__name__}: {e}")

            # Print full traceback so package-level failures are visible.
            traceback.print_exc()

            # If present, print chained exceptions explicitly for deeper root-cause debugging.
            if e.__cause__ is not None:
                print("\nDirect cause:")
                print(f"{type(e.__cause__).__name__}: {e.__cause__}")
                print("".join(traceback.format_exception(type(e.__cause__), e.__cause__, e.__cause__.__traceback__)))

            if e.__context__ is not None and e.__context__ is not e.__cause__:
                print("\nContext:")
                print(f"{type(e.__context__).__name__}: {e.__context__}")
                print("".join(traceback.format_exception(type(e.__context__), e.__context__, e.__context__.__traceback__)))
            raise
    
    '''
    Helper function to perform SPARQL queries to fetch URIs from SynBioHub
    '''
    def sparql_query(self, sbh_url, sbh_token, usergraph, query):
        print(f"Performing SPARQL query on SynBioHub: {query}")
        url = f"{sbh_url}/sparql?{urlencode({'query': query})}"
        response =  requests.get(
            url,
            headers={
                'Accept': 'application/json',
                'X-authorization': sbh_token
            },
        )
        if not response.ok:
            raise Exception(f"SynBioHub sparql query failed ({response.status_code}): {response.text}")
        return response.json()
    
    def sbh_get_subCollection_uris(self, sbh_url, sbh_token, collectionUri, role = None):
        parts = self.sbh_collection_url.split("/")
        usergraph = "/".join(parts[:5])
        if role is None:
            query = f'PREFIX sbol: <http://sbols.org/v2#> SELECT ?s FROM <{usergraph}> WHERE {{ <{collectionUri}> sbol:member ?s }}'
        else:
            query = f'PREFIX sbol: <http://sbols.org/v2#> SELECT ?s FROM <{usergraph}> WHERE {{ ?s sbol:role <{role}> . <{collectionUri}> sbol:member ?s }}'
        return self.sparql_query(sbh_url, sbh_token, usergraph, query)
    
    def sbh_get_attachment_uri(self, sbh_url, sbh_token, collectionUri, attachmentName):
        parts = self.sbh_collection_url.split("/")
        usergraph = "/".join(parts[:5])
        query = f'PREFIX sbol: <http://sbols.org/v2#> PREFIX dcterms: <http://purl.org/dc/terms/> SELECT ?s FROM <{usergraph}> WHERE {{ ?s dcterms:title "{attachmentName}" . <{collectionUri}> sbol:member ?s }}'
        return self.sparql_query(sbh_url, sbh_token, usergraph, query)

    def _upload_to_sbh(self, existing):
        print('uploading to SBH')
        # Add flapjack annotations to the SBOL
        doc = sbol2.Document()
        doc.read(self.file_path_out)
        subCollection = sbol2.Collection(self.importType)
        parts = self.sbh_collection_url.split("/")
        subCollection_url = "/".join(parts[:6]) + "/" + self.importType + "/1"
        search_result = self.sbh_get_subCollection_uris(self.sbh_url,self.sbh_token,subCollection_url)
        for binding in search_result["results"]["bindings"]:
            uri = binding["s"]["value"]
            subCollection.members = subCollection.members + [ uri ]
        for tl in doc:
            if isinstance(tl, sbol2.Experiment):
                self.experimentId = tl.displayId
            subCollection.members = subCollection.members + [ tl.identity ]
            sbol_id = str(tl).split('/')[-2]
            if sbol_id in self.sbol_hash_map:
                setattr(tl, 'Flapjack_ID',
                        sbol2.URIProperty(tl,
                        'https://flapjack.rudge-lab.org/ID',
                            '0', '1', [], initial_value=f'https://{self.fj_url}/{self.sbol_hash_map[sbol_id]}'))
        doc.addCollection(subCollection)
        doc.write(self.file_path_out_FJ)

        # SBH file upload
        if (existing):
            response =  requests.post(
                f'{self.sbh_url}/submit',
                headers={
                    'Accept': 'text/plain',
                    'X-authorization': self.sbh_token
                },
                files={
                    'files': open(self.file_path_out_FJ,'rb'),
                },
                data={
                    'rootCollections' : self.sbh_collection_url,
                    'overwrite_merge' : self.sbh_overwrite_num
                },
            )
            if not response.ok:
                raise Exception(f"SynBioHub submit failed ({response.status_code}): {response.text}")
            return self.sbh_collection_url

        else:
            print("creating new collection")
            response = requests.post(
                f'{self.sbh_url}/submit',
                headers={
                    'Accept': 'text/plain',
                    'X-authorization': self.sbh_token
                },
                files={
                'files': open(self.file_path_out_FJ,'rb'),
                },
                data={
                    'id': self.sbh_collection_name,
                    'version' : '1',
                    'name' : self.sbh_collection_name,
                    'description' : self.sbh_description,
                    'overwrite_merge' : self.sbh_overwrite_num
                },
            )
            if response.text == "Submission id and version already in use":
                print('not submitted')
                self.upload_url = None
                raise AttributeError(f'The collection ({self.sbh_collection_name}) could not be submitted to synbiohub as the collection already exists and overwrite is not on.')

            if not response.ok:
                raise Exception(f"SynBioHub submit failed ({response.status_code}): {response.text}")
            return f'{self.sbol_graph_uri}/{self.sbh_collection_name}/{self.sbh_collection_name}_collection/1'
        
    def _upload_sbh_attachments(self):
        print("uploading attachments")
        headers = {'Accept': 'text/plain', 'X-authorization': self.sbh_token}
        self.version = '1'

        for location, file in self.attachments.items():
            parts = self.sbh_collection_url.split("/")
            subCollection_url = "/".join(parts[:6]) + "/" + self.importType + "/1"
            if isinstance(file, str):
                attachment_name = os.path.basename(file)
            else:
                attachment_name = getattr(file, 'filename', None) or getattr(file, 'name', None)
                if attachment_name is None:
                    attachment_name = str(file)
            search_result = self.sbh_get_attachment_uri(self.sbh_url,self.sbh_token,self.sbh_collection_url,attachment_name)
            for binding in search_result["results"]["bindings"]:
                uri = binding["s"]["value"]
                print(f"Deleting existing attachment {uri}")
                response = requests.get(f'{uri}/remove', headers=headers)
                if not response.ok:
                    raise Exception(f"Deleting existing attachment failed ({response.status_code}): {response.text}")
            if isinstance(file, str):
                with open(file, 'rb') as fobj:
                    upload_file = {'file': (os.path.basename(file), fobj)}
                    collectionID = self.collection_url.split("/")[-3]
                    collectionDisplayId = collectionID + "_collection"
                    if self.experimentId is not None:
                        collectionDisplayId = self.experimentId
                    collectionVersion = self.collection_url.split("/")[-1]
                    response = requests.post(f'{self.sbh_url}/user/{self.sbh_user}/{collectionID}/{collectionDisplayId}/{collectionVersion}/attach', headers=headers, files=upload_file)
                    if not response.ok:
                        raise Exception(f"Uploading attachments to SynBioHub failed ({response.status_code}): {response.text}")
                    print(f'Uploaded attachment {upload_file["file"][0]}: {response.status_code}')
            else:
                # file-like objects
                filename = getattr(file, 'filename', 'attachment')
                fobj = getattr(file, 'stream', None) or getattr(file, 'file', None) or file
                upload_file = {'file': (filename, fobj)}
                collectionID = self.collection_url.split("/")[-3]
                collectionDisplayId = collectionID + "_collection"
                if self.experimentId is not None:
                    collectionDisplayId = self.experimentId
                collectionVersion = self.collection_url.split("/")[-1]
                response = requests.post(f'{self.sbh_url}/user/{self.sbh_user}/{collectionID}/{collectionDisplayId}/{collectionVersion}/attach', headers=headers, files=upload_file)
                if not response.ok:
                    raise Exception(f"Uploading attachments to SynBioHub failed ({response.status_code}): {response.text}")
                print(f'Uploaded attachment {upload_file["file"][0]}: {response.status_code}')

    def _get_sbh_user(self):
        response = requests.get(
            f'{self.sbh_url}/profile',
                headers={
                    'Accept': 'text/plain',
                    'X-authorization': self.sbh_token
                }
        )
        if not response.ok:
            raise Exception(f"Error accessing SynBioHub profile ({response.status_code}): {response.text}")
        self.sbh_user = response.json()["username"]
        self.sbol_graph_uri = response.json()['graphUri']

    def run(self, existing):

        print("Starting XDC run")

        if not self.sbh_token:
            print('Unable to login to SynBioHub')
            raise AttributeError("Unable to login to SynBioHub")

        try:
            self._get_sbh_user()
            print(f"Logged into SynBioHub as user: {self.sbh_user}")
        except Exception as e:
            print('Error logging into SynBioHub')
            raise RuntimeError(f"Error logging into SynBioHub: {e}") from e

        try:
            self.collection_url = self._upload_to_sbh(existing)
            print("collection URL: " + str(self.collection_url))
        except Exception as e:
            print('Error uploading to SynBioHub')
            raise RuntimeError(f"Error uploading to SynBioHub: {e}") from e

        if self.attachments is not None:
            print(self.attachments)
            try:
                self._upload_sbh_attachments()
                print("uploaded attachments to SBH")
            except Exception as e:
                print('Error uploading attachments to SynBioHub')
                raise RuntimeError(f"Error uploading attachments to SynBioHub: {e}") from e

        if self.fj_study_id is not None and self.fj_url is not None and self.fj_token is not None and self.plate_reader_attachments:
            try:
                print('TODO: support upload to Flapjack')
                print('Uploading to Flapjack is not yet implemented in this version of XDC.')
                print('Study id: ' + str(self.fj_study_id))
                print('Flapjack URL: ' + str(self.fj_url))
                print('Flapjack token: ' + str(self.fj_token))
                print('Plate reader attachments: ' + str(self.plate_reader_attachments))
            except Exception as e:
                print('Error uploading to Flapjack')
                raise RuntimeError(f"Error uploading to Flapjack: {e}") from e

        print("XDC run complete")
        return (self.collection_url, None)
    
    def upload_to_existing_collection(self, sbh_url=None, sbh_token=None, collection_url=None, sbh_overwrite: bool=None, 
                        fj_url=None, fj_token=None, fj_study_id=None, fj_overwrite=None, importType=None):

        self.sbh_url = sbh_url
        self.sbh_token = sbh_token
        self.sbh_collection_url = collection_url
        self.sbh_overwrite_num = 3 if sbh_overwrite else 2

        self.fj_url = fj_url
        self.fj_token = fj_token
        self.fj_study_id = fj_study_id
        self.fj_overwrite = fj_overwrite

        self.importType = importType

        return self.run(existing=True)

