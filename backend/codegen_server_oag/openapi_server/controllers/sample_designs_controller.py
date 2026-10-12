import flask
from typing import Dict
from typing import Tuple
from typing import Union

from openapi_server.models.error import Error  # noqa: E501
from openapi_server.models.item import Item  # noqa: E501
from openapi_server.models.mutation_result import MutationResult  # noqa: E501
from openapi_server import util


def clear_sample_designs(x_study_collection, x_syn_bio_hub_url=None):  # noqa: E501
    """Empty the sample designs collection

    Removes every member from the collection. The sub-collection object itself survives, and the SBOL objects are not destroyed -- only their membership is removed. A subsequent GET returns an empty array.  # noqa: E501

    :param x_study_collection: The SynBioHub collection URI of the study the request applies to -- the study the user selects when opening SynBioSuite. This scopes every collection to one study, which is why no per-item ids are needed elsewhere in this API. Must be of the form &lt;scheme&gt;://&lt;host&gt;/user/&lt;user&gt;/&lt;studyId&gt;/&lt;displayId&gt;/&lt;version&gt;. 
    :type x_study_collection: str
    :param x_syn_bio_hub_url: Base URL of the SynBioHub API to talk to. This is a different host from the one in X-Study-Collection (api.synbiohub.org vs synbiohub.org), so it cannot be derived from it reliably. Falls back to the server&#39;s SBS_SBH_URL setting, then to https://api.&lt;study host&gt;. Whichever is used must be an http(s) URL with no query string, fragment or credentials, and its host must resolve to a public address; otherwise the request fails with 400 before anything is sent. The server&#39;s own SBS_SBH_URL origin is exempt from the public-address rule, so a local SynBioHub works in development. 
    :type x_syn_bio_hub_url: str

    :rtype: Union[None, Tuple[None, int], Tuple[None, int, Dict[str, str]]
    """
    return 'do some magic!'


def create_sample_designs(x_study_collection, file, x_syn_bio_hub_url=None, params=None):  # noqa: E501
    """Add to the sample designs collection

    Objects whose URIs already exist are updated in place; everything else is added. Nothing is removed.  # noqa: E501

    :param x_study_collection: The SynBioHub collection URI of the study the request applies to -- the study the user selects when opening SynBioSuite. This scopes every collection to one study, which is why no per-item ids are needed elsewhere in this API. Must be of the form &lt;scheme&gt;://&lt;host&gt;/user/&lt;user&gt;/&lt;studyId&gt;/&lt;displayId&gt;/&lt;version&gt;. 
    :type x_study_collection: str
    :param file: 
    :type file: str
    :param x_syn_bio_hub_url: Base URL of the SynBioHub API to talk to. This is a different host from the one in X-Study-Collection (api.synbiohub.org vs synbiohub.org), so it cannot be derived from it reliably. Falls back to the server&#39;s SBS_SBH_URL setting, then to https://api.&lt;study host&gt;. Whichever is used must be an http(s) URL with no query string, fragment or credentials, and its host must resolve to a public address; otherwise the request fails with 400 before anything is sent. The server&#39;s own SBS_SBH_URL origin is exempt from the public-address rule, so a local SynBioHub works in development. 
    :type x_syn_bio_hub_url: str
    :param params: Optional JSON string of processing parameters.
    :type params: str

    :rtype: Union[MutationResult, Tuple[MutationResult, int], Tuple[MutationResult, int, Dict[str, str]]
    """
    return 'do some magic!'


def get_sample_designs_template(x_study_collection, x_syn_bio_hub_url=None):  # noqa: E501
    """Download the blank Excel template for sample designs

    A blank workbook: the data rows are empty. Its SBH_* lookup sheets are populated with URIs from this study so the sheet can cross-reference objects that already exist. To retrieve existing contents, use GET /sample-designs instead.  # noqa: E501

    :param x_study_collection: The SynBioHub collection URI of the study the request applies to -- the study the user selects when opening SynBioSuite. This scopes every collection to one study, which is why no per-item ids are needed elsewhere in this API. Must be of the form &lt;scheme&gt;://&lt;host&gt;/user/&lt;user&gt;/&lt;studyId&gt;/&lt;displayId&gt;/&lt;version&gt;. 
    :type x_study_collection: str
    :param x_syn_bio_hub_url: Base URL of the SynBioHub API to talk to. This is a different host from the one in X-Study-Collection (api.synbiohub.org vs synbiohub.org), so it cannot be derived from it reliably. Falls back to the server&#39;s SBS_SBH_URL setting, then to https://api.&lt;study host&gt;. Whichever is used must be an http(s) URL with no query string, fragment or credentials, and its host must resolve to a public address; otherwise the request fails with 400 before anything is sent. The server&#39;s own SBS_SBH_URL origin is exempt from the public-address rule, so a local SynBioHub works in development. 
    :type x_syn_bio_hub_url: str

    :rtype: Union[file, Tuple[file, int], Tuple[file, int, Dict[str, str]]
    """
    return 'do some magic!'


def list_sample_designs(x_study_collection, x_syn_bio_hub_url=None):  # noqa: E501
    """Get all the contents of the sample designs collection

    Returns an empty array when the study has no such sub-collection yet, which is the normal state of a freshly created study.  # noqa: E501

    :param x_study_collection: The SynBioHub collection URI of the study the request applies to -- the study the user selects when opening SynBioSuite. This scopes every collection to one study, which is why no per-item ids are needed elsewhere in this API. Must be of the form &lt;scheme&gt;://&lt;host&gt;/user/&lt;user&gt;/&lt;studyId&gt;/&lt;displayId&gt;/&lt;version&gt;. 
    :type x_study_collection: str
    :param x_syn_bio_hub_url: Base URL of the SynBioHub API to talk to. This is a different host from the one in X-Study-Collection (api.synbiohub.org vs synbiohub.org), so it cannot be derived from it reliably. Falls back to the server&#39;s SBS_SBH_URL setting, then to https://api.&lt;study host&gt;. Whichever is used must be an http(s) URL with no query string, fragment or credentials, and its host must resolve to a public address; otherwise the request fails with 400 before anything is sent. The server&#39;s own SBS_SBH_URL origin is exempt from the public-address rule, so a local SynBioHub works in development. 
    :type x_syn_bio_hub_url: str

    :rtype: Union[List[Item], Tuple[List[Item], int], Tuple[List[Item], int, Dict[str, str]]
    """
    return 'do some magic!'


def replace_sample_designs(x_study_collection, file, x_syn_bio_hub_url=None, params=None):  # noqa: E501
    """Replace the sample designs collection contents

    After this call the collection contains exactly what was uploaded.  # noqa: E501

    :param x_study_collection: The SynBioHub collection URI of the study the request applies to -- the study the user selects when opening SynBioSuite. This scopes every collection to one study, which is why no per-item ids are needed elsewhere in this API. Must be of the form &lt;scheme&gt;://&lt;host&gt;/user/&lt;user&gt;/&lt;studyId&gt;/&lt;displayId&gt;/&lt;version&gt;. 
    :type x_study_collection: str
    :param file: 
    :type file: str
    :param x_syn_bio_hub_url: Base URL of the SynBioHub API to talk to. This is a different host from the one in X-Study-Collection (api.synbiohub.org vs synbiohub.org), so it cannot be derived from it reliably. Falls back to the server&#39;s SBS_SBH_URL setting, then to https://api.&lt;study host&gt;. Whichever is used must be an http(s) URL with no query string, fragment or credentials, and its host must resolve to a public address; otherwise the request fails with 400 before anything is sent. The server&#39;s own SBS_SBH_URL origin is exempt from the public-address rule, so a local SynBioHub works in development. 
    :type x_syn_bio_hub_url: str
    :param params: Optional JSON string of processing parameters.
    :type params: str

    :rtype: Union[MutationResult, Tuple[MutationResult, int], Tuple[MutationResult, int, Dict[str, str]]
    """
    return 'do some magic!'
