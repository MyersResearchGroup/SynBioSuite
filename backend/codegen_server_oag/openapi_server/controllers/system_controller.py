import flask
from typing import Dict
from typing import Tuple
from typing import Union

from openapi_server.models.status import Status  # noqa: E501
from openapi_server import util


def get_status():  # noqa: E501
    """Check the API is running

     # noqa: E501


    :rtype: Union[Status, Tuple[Status, int], Tuple[Status, int, Dict[str, str]]
    """
    return 'do some magic!'
