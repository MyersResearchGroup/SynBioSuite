import sbol2
import excel2sbol
import sbol2build as s2b
from sbol2build import abstract_translator as at
from urllib.parse import urlencode
import re
import requests

from typing import List, Tuple

def make_identifier(text: str) -> str:
    """
    Convert arbitrary text into a valid SBOL displayId.

    - Replaces non-alphanumeric characters with '_'
    - Collapses multiple underscores
    - Removes leading/trailing underscores
    - Ensures the first character is a letter or '_'
    """

    identifier = text.strip()

    # Replace non-alphanumeric characters with underscores
    identifier = re.sub(r'[^A-Za-z0-9]+', '_', identifier)

    # Collapse multiple underscores
    identifier = re.sub(r'_+', '_', identifier)

    # Remove leading/trailing underscores
    identifier = identifier.strip('_')

    # Ensure non-empty
    if not identifier:
        identifier = "_"

    # SBOL displayIds must start with a letter or underscore
    elif not re.match(r'^[A-Za-z_]', identifier):
        identifier = "_" + identifier

    return identifier


def get_sbh_user(sbh_url, sbh_token): 
    response = requests.get(
        f'{sbh_url}/profile',
            headers={
                'Accept': 'text/plain',
                'X-authorization': sbh_token
            }
    )
    if not response.ok:
        raise Exception(f"Error accessing SynBioHub profile ({response.status_code}): {response.text}")
    return { 'user': response.json()["username"],
            'graph': response.json()['graphUri'] }

def sparql_query(sbh_url, sbh_token, query):
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

'''
Helper function to perform SPARQL queries to fetch URIs from SynBioHub
'''
def sbh_get_subCollection_uris(sbh_url, sbh_token, usergraph, collectionUri, role = None, type = None):
    if role is None and type is None:
        query = f'PREFIX sbol: <http://sbols.org/v2#> SELECT ?s ?id FROM <{usergraph}> WHERE {{ <{collectionUri}> sbol:member ?s . ?s sbol:displayId ?id }}'
    elif type is None:
        query = f'PREFIX sbol: <http://sbols.org/v2#> SELECT ?s ?id FROM <{usergraph}> WHERE {{ ?s sbol:role <{role}> . <{collectionUri}> sbol:member ?s . ?s sbol:displayId ?id }}'
    elif role is None:
        query = f'PREFIX sbol: <http://sbols.org/v2#> SELECT ?s ?id FROM <{usergraph}> WHERE {{ ?s sbol:type <{type}> . <{collectionUri}> sbol:member ?s . ?s sbol:displayId ?id }}'
    else:
        query = f'PREFIX sbol: <http://sbols.org/v2#> SELECT ?s ?id FROM <{usergraph}> WHERE {{ ?s sbol:type <{type}> . ?s sbol:role <{role}> . <{collectionUri}> sbol:member ?s . ?s sbol:displayId ?id }}'

    return sparql_query(sbh_url, sbh_token, query)
 
def sbh_get_attachment_uri(sbh_url, sbh_token, usergraph, collectionUri, attachmentName):
    query = f'PREFIX sbol: <http://sbols.org/v2#> PREFIX dcterms: <http://purl.org/dc/terms/> SELECT ?s FROM <{usergraph}> WHERE {{ ?s dcterms:title "{attachmentName}" . <{collectionUri}> sbol:member ?s }}'
    return sparql_query(sbh_url, sbh_token, query)

def find_root_module_definitions(doc):
    module_definitions = list(doc.moduleDefinitions)

    # Identities of ModuleDefinitions referenced by Modules
    referenced = {
        str(module.definition)
        for md in module_definitions
        for module in md.modules
        if module.definition
    }

    # Root ModuleDefinitions are not referenced by another Module
    roots = [
        md for md in module_definitions
        if str(md.identity) not in referenced
    ]

    return roots

def convert_to_sbol(input_excel_path: str, file_path_out: str, homespace: str) -> sbol2.Document:
    print("converting to SBOL")
    try:
        sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
        sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
        excel2sbol.converter(file_path_in = input_excel_path, 
        file_path_out = file_path_out, homespace=homespace, sbol_version=2)
        doc = sbol2.Document()
        doc.read(file_path_out)
        print("conversion complete")
        return doc
    except Exception as e:
        print("CONVERSION FAILED --- SEE MESSAGE")
        raise

def abstract_design_2_plasmids(abstract_design_uri: str, plasmid_collection_uri: str, plasmid_vector_uri: str, sbh: sbol2.PartShop) -> Tuple[List[sbol2.Document], sbol2.Document, str]:
    abstract_design_doc = sbol2.Document()
    sbh.pull(
        abstract_design_uri,
        abstract_design_doc
    )

    abstract_design_id = at.extract_toplevel_definition(abstract_design_doc).displayId
    
    plasmid_collection_doc = sbol2.Document()
    sbh.pull(
        plasmid_collection_uri,
        plasmid_collection_doc
    )

    backbone_doc = sbol2.Document()
    sbh.pull(
        plasmid_vector_uri,
        backbone_doc,
    )

    mocloplasmid_list = at.translate_abstract_to_plasmids(
        abstract_design_doc, plasmid_collection_doc, backbone_doc
    )

    part_documents = []
    for mocloPlasmid in mocloplasmid_list:
        temp_doc = sbol2.Document()
        mocloPlasmid.definition.copy(temp_doc)
        at.copy_sequences(
            mocloPlasmid.definition,
            temp_doc,
            plasmid_collection_doc
        )
        part_documents.append(temp_doc)

    return part_documents, backbone_doc, abstract_design_id

def sbol2build_moclo(part_documents: List[sbol2.Document], backbone_doc: sbol2.Document, abstract_design_id: str) -> sbol2.Document:
    assembly_doc = sbol2.Document()
    assembly_obj = s2b.golden_gate_assembly_plan(
        f"{abstract_design_id}_assembly_plan",
        part_documents,
        backbone_doc,
        "BsaI",
        assembly_doc
    )

    composite_list = assembly_obj.run()

    return assembly_doc

""" def generate_transformation_metadata(plasmid_uris: List[str], chassis_uri: str, transformation_machine: str, protocol: str, params: str, sbh: sbol2.PartShop) -> sbol2.Document:
    plasmid_docs = []

    for uri in plasmid_uris:
        temp_doc = sbol2.Document()
        sbh.pull(
            uri,
            temp_doc
        )
        plasmid_docs.append(temp_doc)

    chassis_doc = sbol2.Document()
    sbh.pull(
        chassis_uri,
        chassis_doc
    )

    return bacterial_transformation(sbol2.Document(), chassis_doc, plasmid_docs, transformation_machine, protocol, params)

     """