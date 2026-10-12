import connexion
import six

from swagger_server.models.status import Status  # noqa: E501
from swagger_server import util


def get_status():  # noqa: E501
    """Check the API is running

     # noqa: E501


    :rtype: Status
    """
    return 'do some magic!'
