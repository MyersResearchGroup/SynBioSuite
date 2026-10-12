import unittest

from flask import json

from openapi_server.models.status import Status  # noqa: E501
from openapi_server.test import BaseTestCase


class TestSystemController(BaseTestCase):
    """SystemController integration test stubs"""

    def test_get_status(self):
        """Test case for get_status

        Check the API is running
        """
        headers = { 
            'Accept': 'application/json',
        }
        response = self.client.open(
            '/api/v1/status',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    unittest.main()
