import unittest

from flask import json

from openapi_server.models.error import Error  # noqa: E501
from openapi_server.test import BaseTestCase


class TestModelsController(BaseTestCase):
    """ModelsController integration test stubs"""

    def test_clear_models(self):
        """Test case for clear_models

        [TBD] Empty the models collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/models',
            method='DELETE',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_create_models(self):
        """Test case for create_models

        [TBD] Add to the models collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/models',
            method='POST',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_list_models(self):
        """Test case for list_models

        [TBD] Get all the contents of the models collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/models',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_replace_models(self):
        """Test case for replace_models

        [TBD] Replace the models collection contents
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/models',
            method='PUT',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    unittest.main()
