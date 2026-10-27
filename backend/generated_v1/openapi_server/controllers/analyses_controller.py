import flask
from typing import Dict
from typing import Tuple
from typing import Union

from openapi_server.models.error import Error  # noqa: E501
from openapi_server import util
from sbs_v1 import handlers


def clear_analyses():  # noqa: E501
    """[TBD] Empty the analyses collection

     # noqa: E501

    :param x_study_collection: The SynBioHub collection URI of the study the request applies to -- the study the user selects when opening SynBioSuite. This scopes every collection to one study, which is why no per-item ids are needed elsewhere in this API. Must be of the form &lt;scheme&gt;://&lt;host&gt;/user/&lt;user&gt;/&lt;studyId&gt;/&lt;displayId&gt;/&lt;version&gt;. 
    :type x_study_collection: str
    :param x_syn_bio_hub_url: Base URL of the SynBioHub API to talk to. This is a different host from the one in X-Study-Collection (api.synbiohub.org vs synbiohub.org), so it cannot be derived from it reliably. Falls back to the server&#39;s SBS_SBH_URL setting, then to https://api.&lt;study host&gt;. Whichever is used must be an http(s) URL with no query string, fragment or credentials, and its host must resolve to a public address; otherwise the request fails with 400 before anything is sent. The server&#39;s own SBS_SBH_URL origin is exempt from the public-address rule, so a local SynBioHub works in development. 
    :type x_syn_bio_hub_url: str

    :rtype: Union[None, Tuple[None, int], Tuple[None, int, Dict[str, str]]
    """
    return handlers.handle("DELETE", "/analyses")


def create_analyses():  # noqa: E501
    """[TBD] Add to the analyses collection

     # noqa: E501

    :param x_study_collection: The SynBioHub collection URI of the study the request applies to -- the study the user selects when opening SynBioSuite. This scopes every collection to one study, which is why no per-item ids are needed elsewhere in this API. Must be of the form &lt;scheme&gt;://&lt;host&gt;/user/&lt;user&gt;/&lt;studyId&gt;/&lt;displayId&gt;/&lt;version&gt;. 
    :type x_study_collection: str
    :param x_syn_bio_hub_url: Base URL of the SynBioHub API to talk to. This is a different host from the one in X-Study-Collection (api.synbiohub.org vs synbiohub.org), so it cannot be derived from it reliably. Falls back to the server&#39;s SBS_SBH_URL setting, then to https://api.&lt;study host&gt;. Whichever is used must be an http(s) URL with no query string, fragment or credentials, and its host must resolve to a public address; otherwise the request fails with 400 before anything is sent. The server&#39;s own SBS_SBH_URL origin is exempt from the public-address rule, so a local SynBioHub works in development. 
    :type x_syn_bio_hub_url: str

    :rtype: Union[None, Tuple[None, int], Tuple[None, int, Dict[str, str]]
    """
    return handlers.handle("POST", "/analyses")


def list_analyses():  # noqa: E501
    """[TBD] Get all the contents of the analyses collection

     # noqa: E501

    :param x_study_collection: The SynBioHub collection URI of the study the request applies to -- the study the user selects when opening SynBioSuite. This scopes every collection to one study, which is why no per-item ids are needed elsewhere in this API. Must be of the form &lt;scheme&gt;://&lt;host&gt;/user/&lt;user&gt;/&lt;studyId&gt;/&lt;displayId&gt;/&lt;version&gt;. 
    :type x_study_collection: str
    :param x_syn_bio_hub_url: Base URL of the SynBioHub API to talk to. This is a different host from the one in X-Study-Collection (api.synbiohub.org vs synbiohub.org), so it cannot be derived from it reliably. Falls back to the server&#39;s SBS_SBH_URL setting, then to https://api.&lt;study host&gt;. Whichever is used must be an http(s) URL with no query string, fragment or credentials, and its host must resolve to a public address; otherwise the request fails with 400 before anything is sent. The server&#39;s own SBS_SBH_URL origin is exempt from the public-address rule, so a local SynBioHub works in development. 
    :type x_syn_bio_hub_url: str

    :rtype: Union[None, Tuple[None, int], Tuple[None, int, Dict[str, str]]
    """
    return handlers.handle("GET", "/analyses")


def replace_analyses():  # noqa: E501
    """[TBD] Replace the analyses collection contents

     # noqa: E501

    :param x_study_collection: The SynBioHub collection URI of the study the request applies to -- the study the user selects when opening SynBioSuite. This scopes every collection to one study, which is why no per-item ids are needed elsewhere in this API. Must be of the form &lt;scheme&gt;://&lt;host&gt;/user/&lt;user&gt;/&lt;studyId&gt;/&lt;displayId&gt;/&lt;version&gt;. 
    :type x_study_collection: str
    :param x_syn_bio_hub_url: Base URL of the SynBioHub API to talk to. This is a different host from the one in X-Study-Collection (api.synbiohub.org vs synbiohub.org), so it cannot be derived from it reliably. Falls back to the server&#39;s SBS_SBH_URL setting, then to https://api.&lt;study host&gt;. Whichever is used must be an http(s) URL with no query string, fragment or credentials, and its host must resolve to a public address; otherwise the request fails with 400 before anything is sent. The server&#39;s own SBS_SBH_URL origin is exempt from the public-address rule, so a local SynBioHub works in development. 
    :type x_syn_bio_hub_url: str

    :rtype: Union[None, Tuple[None, int], Tuple[None, int, Dict[str, str]]
    """
    return handlers.handle("PUT", "/analyses")
