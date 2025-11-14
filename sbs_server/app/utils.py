import sbol2
import sbol2build as s2b
from typing import List, Tuple

def abstract_design_2_plasmids(abstract_design_uri: str, plasmid_collection_uri: str, plasmid_vector_uri: str, sbh: sbol2.PartShop) -> Tuple[List[sbol2.Document], sbol2.Document, str]:
    abstract_design_doc = sbol2.Document()
    sbh.pull(
        abstract_design_uri,
        abstract_design_doc
    )

    abstract_design_id = s2b.abstract_translator.extract_toplevel_definition(abstract_design_doc).displayId
    
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

    mocloplasmid_list = s2b.abstract_translator.translate_abstract_to_plasmids(
        abstract_design_doc, plasmid_collection_doc, backbone_doc
    )

    part_documents = []
    for mocloPlasmid in mocloplasmid_list:
        temp_doc = sbol2.Document()
        mocloPlasmid.definition.copy(temp_doc)
        s2b.abstract_translator.copy_sequences(
            mocloPlasmid.definition,
            temp_doc,
            plasmid_collection_doc
        )
        part_documents.append(temp_doc)

    return part_documents, backbone_doc, abstract_design_id

def sbol2build_moclo(part_documents: List[sbol2.Document], backbone_doc: sbol2.document, abstract_design_id: str) -> sbol2.Document:
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