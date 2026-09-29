import sbol2
import excel2sbol
import excel2sbol.compiler
import excel2sbol.library2
import sbol2build as s2b
from sbol2build import abstract_translator as at
from contextlib import contextmanager
from requests.adapters import HTTPAdapter
from urllib.parse import urlencode, urlsplit
import os
import re

from . import sbh_http
from typing import Iterator, List, Tuple

# (connect, read) seconds for requests to SynBioHub. Without a timeout a hung
# SynBioHub holds a uwsgi worker until harakiri (180 s, sbs_server/uwsgi.ini),
# and with processes=4 a handful of those stall the whole backend. nginx already
# gives up on the client after ~60 s, so waiting longer only ties up the worker.
SBH_TIMEOUT = (5, 30)
# /submit answers only after SynBioHub has parsed and stored the whole document,
# so it gets longer -- still under harakiri, and generous enough that the legacy
# upload routes keep finishing slow submits they finish today.
SBH_SUBMIT_TIMEOUT = (5, 120)

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
    response = sbh_http.get(
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
    response =  sbh_http.get(
        url,
        headers={
            'Accept': 'application/json',
            'X-authorization': sbh_token
        },
        timeout=SBH_TIMEOUT,
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

def find_root_component_definitions(doc):
    component_definitions = list(doc.componentDefinitions)

    # Identities of ComponentDefinitions referenced by Components
    referenced = {
        str(component.definition)
        for cd in component_definitions
        for component in cd.components
        if component.definition
    }

    # Root ComponentDefinitions are not referenced by another Component
    roots = [
        cd for cd in component_definitions
        if str(cd.identity) not in referenced
    ]

    return roots

@contextmanager
def sbol_validation_disabled() -> Iterator[None]:
    """Stop sbol2 sending documents to validator.sbolstandard.org in this block.

    With VALIDATE on (sbol2's default), every Document.write() POSTs the whole
    document to that third-party service, with no timeout, and returns the
    verdict as a string that no caller here reads: excel2sbol's compiler and
    upload_to_sbh both discard it. "Invalid" blocks nothing; an unreachable or
    slow validator fails or hangs the upload. The previous value is restored
    on the way out. Process-global, like the rest of sbol2's Config: fine under
    the shipped uwsgi.ini (processes = 4, no threads).
    """
    previous = sbol2.Config.getOption(sbol2.ConfigOptions.VALIDATE)
    sbol2.Config.setOption(sbol2.ConfigOptions.VALIDATE, False)
    try:
        yield
    finally:
        sbol2.Config.setOption(sbol2.ConfigOptions.VALIDATE, previous)

# os.environ keys excel2sbol uses as per-run state. It sets them and never
# clears them, so one upload's values would steer every later conversion in the
# same uwsgi worker: COUNTER="Error found" stops every later conversion writing
# its output, and a leftover SBOL_DICTIONARY sends the next workbook's
# displayIds to the previous uploader's Domain.
EXCEL2SBOL_RUN_ENV = ('COUNTER', 'SBOL_DICTIONARY')

class WorkbookNetworkError(Exception):
    """Conversion tried to make an HTTP request. Nothing was sent."""

@contextmanager
def _replaced(owner, name: str, value) -> Iterator[None]:
    # getattr raises if a newer excel2sbol renames `name`: every conversion
    # then fails loudly rather than quietly running the original.
    original = getattr(owner, name)
    setattr(owner, name, value)
    try:
        yield
    finally:
        setattr(owner, name, original)

def _link_is_valid(*_args, **_kwargs) -> bool:
    # What link_validation returns for a reachable URL: the cell's URL is kept
    # as a reference. excel2sbol's SBOL3 path keeps it without checking at all.
    return True

def _no_welcome_sheet(*_args, **_kwargs) -> None:
    # The welcome sheet's only use is the Domain lookups in displayId() and
    # sequence_authentication(); with no welcome data they never run.
    return None

def _refuse_request(_adapter, request, **_kwargs):
    raise WorkbookNetworkError(
        f'Conversion tried to contact {urlsplit(request.url).hostname}; '
        'the server does not fetch URLs named in workbooks'
    )

def _clear_excel2sbol_env() -> None:
    for key in EXCEL2SBOL_RUN_ENV:
        os.environ.pop(key, None)

@contextmanager
def excel2sbol_offline() -> Iterator[None]:
    """Run excel2sbol without it making any request, from fresh state.

    Left alone, excel2sbol (5910698) GETs every URL in a Sequence or (URI) cell
    (library2.link_validation) and, when the welcome sheet sets a Domain,
    searches that host for every displayId and sequence -- no timeout, and the
    uploaded workbook picks the host. None of the responses end up in the
    document: they only decide whether to warn, skip writing (COUNTER) or
    sys.exit. So the checks are switched off rather than routed through
    sbh_http, and HTTPAdapter.send refuses anything else, which is every
    requests call excel2sbol and sbol2.PartShop make.

    Process-global, like sbol_validation_disabled: fine under the shipped
    uwsgi.ini (processes = 4, no threads).
    """
    _clear_excel2sbol_env()
    try:
        with _replaced(excel2sbol.library2, 'link_validation', _link_is_valid), \
                _replaced(excel2sbol.compiler, 'initialise_welcome', _no_welcome_sheet), \
                _replaced(HTTPAdapter, 'send', _refuse_request):
            yield
    finally:
        _clear_excel2sbol_env()

def convert_to_sbol(input_excel_path: str, file_path_out: str, homespace: str) -> sbol2.Document:
    print("converting to SBOL")
    try:
        sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
        sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
        # excel2sbol ends with doc.write() (compiler.py:474).
        with sbol_validation_disabled(), excel2sbol_offline():
            excel2sbol.converter(file_path_in = input_excel_path,
            file_path_out = file_path_out, homespace=homespace, sbol_version=2)
        doc = sbol2.Document()
        doc.read(file_path_out)
        print("conversion complete")
        return doc
    except SystemExit as exit_:
        # excel2sbol calls sys.exit() on some input. SystemExit is not an
        # Exception, so it would get past every handler instead of becoming a 400.
        print("CONVERSION FAILED --- excel2sbol exited")
        raise RuntimeError('excel2sbol stopped the conversion early') from exit_
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