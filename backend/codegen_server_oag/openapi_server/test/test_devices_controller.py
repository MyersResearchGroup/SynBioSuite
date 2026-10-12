import unittest

from flask import json

from openapi_server.models.error import Error  # noqa: E501
from openapi_server.models.item import Item  # noqa: E501
from openapi_server.models.mutation_result import MutationResult  # noqa: E501
from openapi_server.test import BaseTestCase


class TestDevicesController(BaseTestCase):
    """DevicesController integration test stubs"""

    def test_clear_devices(self):
        """Test case for clear_devices

        Empty the devices collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/devices',
            method='DELETE',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    @unittest.skip("multipart/form-data not supported by Connexion")
    def test_create_devices(self):
        """Test case for create_devices

        Add to the devices collection
        """
        headers = { 
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        data = dict(file='/path/to/file',
                    params='params_example')
        response = self.client.open(
            '/api/v1/devices',
            method='POST',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_list_devices(self):
        """Test case for list_devices

        Get all the contents of the devices collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/devices',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    @unittest.skip("multipart/form-data not supported by Connexion")
    def test_replace_devices(self):
        """Test case for replace_devices

        Replace the devices collection contents
        """
        headers = { 
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        data = dict(file='/path/to/file',
                    params='params_example')
        response = self.client.open(
            '/api/v1/devices',
            method='PUT',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    unittest.main()
