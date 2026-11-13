"""Collection registry -- the single source of truth for the /api/v1 surface.

Each CollectionSpec maps one REST path onto the SynBioHub sub-collection that backs
it. ``import_type`` is that sub-collection's displayId: the same value the frontend
derives today by capitalising an ObjectType's ``subdirectory`` (frontend/src/API.js)
and hands to ``upload_to_sbh`` as ``importType``.
"""
from dataclasses import dataclass, field
from typing import Dict, FrozenSet, Optional

EXCEL = 'excel'
SBOL = 'sbol'

# The legacy POST /api/uploadSBOL reads these too, through homespace_for(), so an
# object lands on the same URI whichever API uploads it.
CANVAS_HOMESPACE = 'https://sbolcanvas.org/'
EXAMPLE_HOMESPACE = 'https://example.com/'
DEFAULT_HOMESPACE = 'https://synbiosuite.org/'

# Every workbook converts against this homespace, regardless of type: here
# (ingest._convert_workbook) and in the legacy XDC routes (services/xdc.py).
EXCEL_HOMESPACE = 'https://example.org/'


@dataclass(frozen=True)
class CollectionSpec:
    """One collection's mapping onto SynBioHub.

    ``homespace`` applies to the SBOL ingest path only; workbooks always convert
    against ``EXCEL_HOMESPACE`` (see ingest._convert_workbook), matching the
    legacy XDC routes (services/xdc.py).
    """
    path: str
    import_type: str
    accepts: FrozenSet[str] = field(default_factory=frozenset)
    homespace: str = DEFAULT_HOMESPACE
    template_type: Optional[str] = None
    implemented: bool = True

    @property
    def excel_backed(self) -> bool:
        return EXCEL in self.accepts

    @property
    def sbol_backed(self) -> bool:
        return SBOL in self.accepts


def _spec(path, import_type, accepts, homespace=DEFAULT_HOMESPACE,
          template_type=None, implemented=True):
    return CollectionSpec(
        path=path,
        import_type=import_type,
        accepts=frozenset(accepts),
        homespace=homespace,
        template_type=template_type,
        implemented=implemented,
    )


_SPECS = [
    _spec('resources', 'Resources', (EXCEL, SBOL),
          template_type='synbio.object-type.resources'),
    _spec('devices', 'Devices', (SBOL,), homespace=EXAMPLE_HOMESPACE),
    _spec('designs', 'Designs', (SBOL,), homespace=CANVAS_HOMESPACE),
    _spec('plasmids', 'Plasmids', (SBOL,), homespace=EXAMPLE_HOMESPACE),
    _spec('strains', 'Strains', (EXCEL, SBOL),
          template_type='synbio.object-type.strains'),
    _spec('sample-designs', 'SampleDesigns', (EXCEL, SBOL),
          template_type='synbio.object-type.sample-designs'),
    _spec('assays', 'Assays', (EXCEL, SBOL),
          template_type='synbio.object-type.study-data'),

    # Registered so the URL surface matches the agreed resource map; these answer
    # 501 until their formats (SBML / OMEX / iBioSim) are specified.
    _spec('models', 'Models', (), homespace=CANVAS_HOMESPACE, implemented=False),
    _spec('archives', 'Archives', (), implemented=False),
    _spec('analyses', 'Analyses', (), implemented=False),
]

COLLECTIONS: Dict[str, CollectionSpec] = {spec.path: spec for spec in _SPECS}

_HOMESPACE_BY_IMPORT_TYPE: Dict[str, str] = {
    spec.import_type: spec.homespace for spec in _SPECS
}


def get_collection(path: str) -> Optional[CollectionSpec]:
    return COLLECTIONS.get(path)


def homespace_for(import_type: Optional[str]) -> str:
    """The homespace an SBOL upload of `import_type` creates its objects under.

    DEFAULT_HOMESPACE for an import type no collection has.
    """
    return _HOMESPACE_BY_IMPORT_TYPE.get(import_type, DEFAULT_HOMESPACE)
