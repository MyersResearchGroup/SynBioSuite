from excel2flapjack.main import X2F
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
    def __init__(self, input_excel_path, attachments=None, homespace='https://example.org/'):
        self.input_excel_path = input_excel_path
        self.attachments = attachments
        self.x2f = None
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
        self.fj_user = None
        self.fj_pass = None
        self.fj_overwrite = False
        self.fj_token = None

        self.sbh_url = None
        self.sbh_user = None
        self.sbh_pass = None
        self.sbh_token = None
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

    def _log_in_fj(self):
        print("logging into fj")
        if not self.fj_url:
            print('No Flapjack URL provided')
            self.fj_token = None
            return
        
        self.x2f = X2F(excel_path=self.input_excel_path, 
                       fj_url=self.fj_url, 
                       overwrite=self.fj_overwrite)
        
        if self.fj_token:
            self.x2f.fj.log_in_token(username=self.fj_user, 
                                     access_token=None, 
                                     refresh_token=self.fj_token)
            self.x2f.fj.refresh()

        elif self.fj_user and self.fj_pass:
            self.x2f.fj.log_in(username=self.fj_user, password=self.fj_pass)
            self.fj_token = self.x2f.fj.refresh_token
        
        else:
            print('Unable to authenticate into Flapjack')
            self.fj_token = None
            #TODO check token validity
        

    def _log_in_sbh(self):
        # SBH Login
        print("logging into SBH")
        if self.sbh_token:
            pass
            # already logged in, checks validity in next step
        elif self.sbh_user and self.sbh_pass:
            response = requests.post(
                f'{self.sbh_url}/login',
                headers={'Accept': 'text/plain'},
                data={
                    'email': self.sbh_user,
                    'password' : self.sbh_pass,
                    }
            )
            if not response.ok:
                raise Exception(f"SynBioHub login failed ({response.status_code}): {response.text}")
            self.sbh_token = response.text
        else:
            print("Unable to login to SynBioHub")
            raise Exception(f"Unable to login to SynBioHub")
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
        print(self.sbh_user)
        self.sbol_graph_uri = response.json()['graphUri']

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

    def _generate_sbol_hash_map(self):
        print("generating sbol hash map")
        # Pull graph uri from synbiohub
        response = requests.get(
            f'{self.sbh_url}/profile',
            headers={
                'Accept': 'text/plain',
                'X-authorization': self.sbh_token
                }
        )
        print("status:", response.status_code)
        print("headers:", response.headers)
        print("body:", response.text)
        print("content: ", response.content)
        if not response.ok:
            raise Exception(f"Error accessing SynBioHub profile ({response.status_code}): {response.text}")
        self.sbh_user = response.json()["username"]
        print(self.sbh_user)
        self.sbol_graph_uri = response.json()['graphUri']
        sbol_collec_url = f'{self.sbol_graph_uri}/{self.sbh_collection_name}'

        # create hashmap of flapjack id to sbol uri
        self.sbol_hash_map = {}
        for tl in self.sbol_doc:
            #if 'https://flapjack.rudge-lab.org/ID' in tl.properties:
            sbol_uri = tl.properties['http://sbols.org/v2#persistentIdentity'][0]
            sbol_uri = sbol_uri.replace(self.homespace, sbol_collec_url)
            sbol_uri = f'{sbol_uri}/1'

            sbol_name = str(tl.properties['http://sbols.org/v2#displayId'][0])
            self.sbol_hash_map[sbol_name] = sbol_uri


    def _upload_to_fj(self, header_rows=3):
        print("")
        self.x2f.sbol_hash_map = self.sbol_hash_map
        self.x2f.generate_sheets_to_object_mapping()
        self.x2f.index_skiprows = header_rows
        self.x2f.create_df()
        # change to upload_object_in_sheets
        # self.x2f.upload_all() 
        self.x2f.upload_objects_in_sheets()
    
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


    def run(self, existing):

        print("Starting XDC run")

        try:
            self._log_in_sbh()
        except Exception as e:
            print('Error logging into SynBioHub')
            raise RuntimeError(f"Error logging into SynBioHub: {e}") from e

        if not self.sbh_token:
            print('Unable to login to SynBioHub')
            raise AttributeError("Unable to login to SynBioHub")


        if self.fj_url:
            try:
                self._log_in_fj()
            except Exception as e:
                print('Error logging into Flapjack')
                raise RuntimeError(f"Error logging into Flapjack: {e}") from e

            try:
                self._generate_sbol_hash_map()
                print("sbol hash map generated")
            except Exception as e:
                print('Error generating SBOL hash map')
                raise RuntimeError(f"Error generating SBOL hash map: {e}") from e

            try:
                self._upload_to_fj()
            except Exception as e:
                print('Error uploading to Flapjack')
                raise RuntimeError(f"Error uploading to Flapjack: {e}") from e

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

        print("XDC run complete")
        return (self.collection_url, None)
   
    def get_sbol_document(self):
        return self.sbol_doc


    def upload_to_new_collection(self, sbh_url, sbh_collection_name, sbh_overwrite: bool, sbh_description=None,
                          sbh_user=None, sbh_pass=None, sbh_token=None,  
                          fj_url=None, fj_overwrite=None, 
                          fj_user=None, fj_pass=None, fj_token=None):
        
        self.sbh_url = sbh_url
        self.sbh_user = sbh_user
        self.sbh_pass = sbh_pass
        self.sbh_token = sbh_token

        self.sbh_collection_name = sbh_collection_name
        if sbh_description is None:
            self.sbh_description = 'Collection of SBOL files uploaded by XDC'
        else:
            self.sbh_description = sbh_description
        self.sbh_overwrite_num = 1 if sbh_overwrite else 0

        self.fj_url = fj_url
        self.fj_user = fj_user
        self.fj_pass = fj_pass
        self.fj_token = fj_token
        # TODO: Flapjack overwrite settings
        self.fj_overwrite = fj_overwrite

        return self.run(existing=False)
    

    def upload_to_existing_collection(self, sbh_url, collection_url, sbh_overwrite: bool, 
                          sbh_user=None, sbh_pass=None, sbh_token=None,  
                          fj_url=None, fj_overwrite=None, 
                          fj_user=None, fj_pass=None, fj_token=None, importType=None):

        self.sbh_url = sbh_url
        self.sbh_user = sbh_user
        self.sbh_pass = sbh_pass
        self.sbh_token = sbh_token

        self.sbh_collection_url = collection_url
        self.sbh_overwrite_num = 3 if sbh_overwrite else 2

        self.fj_url = fj_url
        self.fj_user = fj_user
        self.fj_pass = fj_pass
        self.fj_token = fj_token
        # TODO: Flapjack overwrite settings
        self.fj_overwrite = fj_overwrite
        self.importType = importType

        return self.run(existing=True)



class XDE:

    """XDE (Experimental Data Extractor) class to extract experimental data from
    plate reader excel output and writes it in an XDC template.

    ...

    Attributes
    ----------


    Methods
    -------
    getFileNameFromString(string)
        Extracts the file name from a string
    generateSampleData(file_list,sheet_to_read_from,time_col_name,data_cols_offset)
        Generates sample data from the input excel files
    getNumRows(dataframe,starting_row_idx,starting_col_idx)
        Gets the number of rows for the data
    buildFinalDF(file_list,sample_data_list,time_col_name,data_cols_offset,num_rows_btwn_data,sheet_to_read_from)
        Builds the final dataframe
    writeToMeasurements(XDC_file_name,final_dataframe)
        Writes the final dataframe to the measurements sheet
    extractData(file_list,sheet_to_read_from,time_col_name,data_cols_offset,num_rows_btwn_data)
        Full run; extracts data from the input excel files and writes it to the XDC sheet

    """
    def getFileNameFromString(self, string):
        pattern = r'[\w-]+?(?=\.)'
        # searching the pattern
        result = re.search(pattern, string)
    
        return result.group()

    def generateSampleData(self, file_list, sheet_to_read_from, time_col_name, data_cols_offset=0): 
        num_assays = len(file_list) - 1
        file_name_list = []

        for i in range(num_assays):
            file_name_list.append(self.getFileNameFromString(file_list[i + 1]))

        #final products
        result = pd.DataFrame()
        sample_data_list = []

        #components:result
        assay_id = []
        column = []
        row = []
        sample_id = []

        #componenets:sample_data_list
        columnID = []
        assay_num = []

        #processing:main
        current_sample_id = 1

        for i in range(num_assays):

            current_num_assay = i + 1

            #locating instances of time_col_name
            raw_df = pd.read_excel(file_list[i+1],sheet_to_read_from)
            rows, cols = np.where(raw_df == time_col_name)
            time_col_locations = list(zip(rows, cols))
            num_rows = self.getNumRows(raw_df,rows[0],cols[0])
            
            #extracting signal 1 data to check for blank columns
            start_row = time_col_locations[0][0] + 1
            start_col = data_cols_offset
            num_cols = 96
            working_df = raw_df.iloc[start_row:start_row + num_rows, start_col:start_col + num_cols] #maybe subtract 1 from num rows

            # Check for completely blank (all NaN) columns using numpy
            is_blank = working_df.isna().all().to_numpy()

            # Get the indices of non-blank columns
            data_col_IDX = np.where(~is_blank)[0]
            
            #add to lists
            for j in range(len(data_col_IDX)):
                #result
                assay_id.append(file_name_list[i])
                column.append(data_col_IDX[j] % 12 + 1) #IDX % 12 + 1
                row.append((data_col_IDX[j]//12) + 1)   #IDX // 12 + 1
                sample_id.append(f"Sample{current_sample_id}")
                current_sample_id += 1

                #sample_data_list
                columnID.append(data_col_IDX[j])
                assay_num.append(current_num_assay)

        #assembly:result
        result.insert(0, "Assay ID", assay_id)
        result.insert(0, "Column", column)
        result.insert(0, "Row", row)
        result.insert(0, "Sample ID", sample_id)
        
        #assembly:sample_data_list
        for i in range(len(result)):
            temp_tuple = (sample_id[i],columnID[i],assay_num[i])
            sample_data_list.append(temp_tuple)
        
        with pd.ExcelWriter(file_list[0], mode='a', engine='openpyxl', if_sheet_exists='replace') as writer:
            result.to_excel(writer,'Sample',startrow=3,index=False)

        return sample_data_list

    def getNumRows(self, dataframe, starting_row_idx, starting_col_idx):
        num_rows = 0
        counter = 1
        time_col_value = dataframe.iloc[starting_row_idx, starting_col_idx]

        while True:
            current_cell = dataframe.iloc[starting_row_idx + counter, starting_col_idx]
            if pd.isna(current_cell) or current_cell == time_col_value:
                break
            if(len(dataframe) <= counter + starting_row_idx + 1): #edge case for if there is only one signal, IDK why i have to add a +1
                num_rows += 1
                break

            counter += 1
            num_rows += 1
            
        return num_rows 

    def buildFinalDF(self, file_list, sample_data_list, time_col_name, data_cols_offset, num_rows_btwn_data, sheet_to_read_from):
        print(file_list)
        output = pd.DataFrame() 
        time_col_locations = []
        num_rows_per_assay = []
        dataframe_list = []
        num_assays = len(file_list) - 1

        for i in range(num_assays):
            raw_df = pd.read_excel(file_list[i+1],sheet_to_read_from)
            rows, cols = np.where(raw_df == time_col_name)
            temp = list(zip(rows, cols))
            num_rows_per_assay.append(self.getNumRows(raw_df,rows[0],cols[0]))
            time_col_locations.append(temp)
            dataframe_list.append(pd.read_excel(file_list[i + 1],sheet_to_read_from))
            
        for i in range(len(sample_data_list)):  #initilizing information about the current sample and its results
            rows_to_be_read = []
            current_sample_id = str(sample_data_list[i][0])               
            current_col = sample_data_list[i][1]
            current_assay = sample_data_list[i][2]
            current_first_row = time_col_locations[current_assay - 1][0][0] + 1
            current_time_col = time_col_locations[current_assay - 1][0][1]
            current_num_rows = num_rows_per_assay[current_assay - 1]
            current_num_signals = len(time_col_locations[current_assay - 1])

            for j in range(current_num_signals): 
                rows_to_be_read.extend(list(range(current_first_row + ((current_num_rows + num_rows_btwn_data + 1)* j), current_first_row + current_num_rows + ((current_num_rows + num_rows_btwn_data + 1)* j))))
            working_df = dataframe_list[current_assay - 1].iloc[rows_to_be_read,[current_time_col,current_col + data_cols_offset]].copy() # at this point it will be the time col and current col for both signals
            working_df.columns = ["Time", "Value"]
            #add signal label
            signal_id = []
            for k in range(current_num_signals):
                signal_id.extend([f"Signal{k + 1}"] * current_num_rows)
            working_df.insert(0, "Signal ID", signal_id)

            #add sample label
            sample_id = [current_sample_id] * len(working_df)
            working_df.insert(0, "Sample ID", sample_id)

            #concat working_df and output
            output = pd.concat([output, working_df], ignore_index=True)

        #add measurement
        measurement_id = []
        for i in range(len(output)):
            measurement_id.append(f"Measurement{i}")
        output.insert(0, "Measurement ID", measurement_id)

        return output

    def buildFinalDFCSV(self, file_list, sample_data_list, time_col_name, data_cols_offset, num_rows_btwn_data):
        output = pd.DataFrame() 
        time_col_locations = []
        num_rows_per_assay = []
        dataframe_list = []
        num_assays = len(file_list) - 1

        for i in range(num_assays):
            raw_df = pd.read_csv(file_list[i+1])
            rows, cols = np.where(raw_df == time_col_name)
            temp = list(zip(rows, cols))
            num_rows_per_assay.append(self.getNumRows(raw_df,rows[0],cols[0]))
            time_col_locations.append(temp)
            dataframe_list.append(pd.read_csv(file_list[i + 1]))
            
        for i in range(len(sample_data_list)):  #initilizing information about the current sample and its results
            rows_to_be_read = []
            current_sample_id = sample_data_list[i][0]               
            current_col = sample_data_list[i][1]
            current_assay = sample_data_list[i][2]
            current_first_row = time_col_locations[current_assay - 1][0][0] + 1
            current_time_col = time_col_locations[current_assay - 1][1][1]
            current_num_rows = num_rows_per_assay[current_assay - 1]
            current_num_signals = len(time_col_locations[current_assay - 1])

            for j in range(current_num_signals): 
                rows_to_be_read.extend(list(range(current_first_row + ((current_num_rows + num_rows_btwn_data + 1)* j), current_first_row + current_num_rows + ((current_num_rows + num_rows_btwn_data + 1)* j))))
            
            working_df = dataframe_list[current_assay - 1].iloc[rows_to_be_read,[current_time_col,current_col + data_cols_offset]].copy() # at this point it will be the time col and current col for both signals
            working_df.columns = ["Time", "Value"]

            #add signal label
            signal_id = []
            for k in range(current_num_signals):
                signal_id.extend([f"Signal{k + 1}"] * current_num_rows)
            working_df.insert(0, "Signal ID", signal_id)

            #add sample label
            sample_id = [current_sample_id] * len(working_df)
            working_df.insert(0, "Sample ID", sample_id)

            #concat working_df and output
            output = pd.concat([output, working_df], ignore_index=True)

        #add measurement
        measurement_id = []
        for i in range(len(output)):
            measurement_id.append(f"Measurement{i}")
        output.insert(0, "Measurement ID", measurement_id)

        return output


    def writeToMeasurements(self, XDC_file_name, final_dataframe):
        book = load_workbook(XDC_file_name)
        sheet = book['Measurement']

        # Clear the existing data in the 'Measurement' sheet
        sheet.delete_rows(1, sheet.max_row)

        # Write three blank rows before writing the data
        for _ in range(3):
            sheet.append([''] * 5)

        # Write the headers
        sheet.append(['Measurement ID', 'Sample ID', 'Signal ID', 'Time', 'Value'])

        # Write the data
        for row in final_dataframe.itertuples(index=False):
            sheet.append(list(row))

        book.save(XDC_file_name)
        book.close()

        return
    
    def run(self, file_list, sheet_to_read_from, time_col_name='Time', data_cols_offset=0, num_rows_btwn_data=0):
        """
        Full run; extracts data from the input excel files and writes it to the XDC sheet.
        """
        sample_list = self.generateSampleData(file_list, sheet_to_read_from, time_col_name, data_cols_offset)
        output_df = self.buildFinalDF(file_list, sample_list, time_col_name, data_cols_offset, num_rows_btwn_data, sheet_to_read_from)
        self.writeToMeasurements(file_list[0], output_df)
