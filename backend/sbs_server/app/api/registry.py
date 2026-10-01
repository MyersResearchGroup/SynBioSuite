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

# Homespaces mirror the ``homespaces`` dict in route.py:sbol_upload so that objects
# created through this API land on the same URIs as the legacy endpoints do.
CANVAS_HOMESPACE = 'https://sbolcanvas.org/'
EXAMPLE_HOMESPACE = 'https://example.com/'
DEFAULT_HOMESPACE = 'https://synbiosuite.org/'

# route.py:xdc_run converts workbooks against this homespace, regardless of type.
EXCEL_HOMESPACE = 'https://example.org/'


@dataclass(frozen=True)
class CollectionSpec:
    """One collection's mapping onto SynBioHub.

    ``homespace`` applies to the SBOL ingest path only; workbooks always convert
    against ``EXCEL_HOMESPACE`` (see ingest._convert_workbook), matching the
    existing xdc_run behaviour.
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


def get_collection(path: str) -> Optional[CollectionSpec]:
    return COLLECTIONS.get(path)
