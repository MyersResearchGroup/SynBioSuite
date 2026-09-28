"""synbiohubUpload helpers shared by the legacy routes and /api/v1."""
import sbol2

from conftest import STUDY_URI, TOKEN, FakeResponse
from sbs_server.app.synbiohubUpload import subcollection_members, upload_to_sbh

SBH_URL = 'https://api.synbiohub.org'
SBH_PREFIX = 'https://synbiohub.org/user/pmeka12/Test/'
USERGRAPH = 'https://synbiohub.org/user/pmeka12'
MERGE_AND_OVERWRITE = 3


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


def test_upload_to_sbh_does_not_send_the_document_to_the_validator(fake_sbh, tmp_path):
    """The legacy routes and /api/v1 both submit through here (H3).

    With sbol2's VALIDATE at its default, doc.write() would POST the document
    to validator.sbolstandard.org; fake_sbh rejects that as an unregistered
    request.
    """
    fake_sbh.register('GET', '/sparql',
                      FakeResponse(200, json_data={'results': {'bindings': []}}))
    fake_sbh.register('POST', '/submit', FakeResponse(200, text='Successfully uploaded'))
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
    doc = sbol2.Document()
    doc.addComponentDefinition(_part('https://example.com/', 'new_part'))

    upload_to_sbh(doc, SBH_URL, SBH_PREFIX, TOKEN, USERGRAPH, STUDY_URI,
                  'resources', str(tmp_path / 'out.xml'), MERGE_AND_OVERWRITE)

    assert [call.method for call in fake_sbh.calls] == ['GET', 'POST']
    assert fake_sbh.calls_matching('/submit')
    assert sbol2.Config.getOption(sbol2.ConfigOptions.VALIDATE) is True
