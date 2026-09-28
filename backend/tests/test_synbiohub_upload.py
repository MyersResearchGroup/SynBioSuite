"""synbiohubUpload helpers shared by the legacy routes and /api/v1."""
import sbol2

from sbs_server.app.synbiohubUpload import subcollection_members

SBH_PREFIX = 'https://synbiohub.org/user/pmeka12/Test/'


def _part(homespace, display_id):
    sbol2.setHomespace(homespace)
    return sbol2.ComponentDefinition(display_id)


def test_subcollection_members_skips_objects_already_on_synbiohub():
    """Only objects this upload creates are listed in the sub-collection."""
    previous = sbol2.getHomespace()
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
    try:
        doc = sbol2.Document()
        doc.addComponentDefinition(_part('https://example.com/', 'new_part'))
        doc.addComponentDefinition(_part(SBH_PREFIX, 'stored_part'))
    finally:
        sbol2.setHomespace(previous)

    listed = subcollection_members(doc, SBH_PREFIX)

    assert [tl.displayId for tl in listed] == ['new_part']
    assert [tl.identity for tl in listed] == ['https://example.com/new_part/1']
