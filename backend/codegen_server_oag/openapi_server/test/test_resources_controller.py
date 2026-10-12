import unittest

from flask import json

from openapi_server.models.error import Error  # noqa: E501
from openapi_server.models.item import Item  # noqa: E501
from openapi_server.models.mutation_result import MutationResult  # noqa: E501
from openapi_server.test import BaseTestCase


class TestResourcesController(BaseTestCase):
    """ResourcesController integration test stubs"""

    def test_clear_resources(self):
        """Test case for clear_resources

        Empty the resources collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/resources',
            method='DELETE',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    @unittest.skip("multipart/form-data not supported by Connexion")
    def test_create_resources(self):
        """Test case for create_resources

        Add to the resources collection
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
            '/api/v1/resources',
            method='POST',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_get_resources_template(self):
        """Test case for get_resources_template

        Download the blank Excel template for resources
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/resources/template',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_list_resources(self):
        """Test case for list_resources

        Get all the contents of the resources collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/resources',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    @unittest.skip("multipart/form-data not supported by Connexion")
    def test_replace_resources(self):
        """Test case for replace_resources

        Replace the resources collection contents
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
            '/api/v1/resources',
            method='PUT',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    unittest.main()
