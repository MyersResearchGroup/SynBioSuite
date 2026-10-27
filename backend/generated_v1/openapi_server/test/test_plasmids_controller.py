import unittest

from flask import json

from openapi_server.models.error import Error  # noqa: E501
from openapi_server.models.item import Item  # noqa: E501
from openapi_server.models.mutation_result import MutationResult  # noqa: E501
from openapi_server.test import BaseTestCase


class TestPlasmidsController(BaseTestCase):
    """PlasmidsController integration test stubs"""

    def test_clear_plasmids(self):
        """Test case for clear_plasmids

        Empty the plasmids collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/plasmids',
            method='DELETE',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    @unittest.skip("multipart/form-data not supported by Connexion")
    def test_create_plasmids(self):
        """Test case for create_plasmids

        Add to the plasmids collection
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
            '/api/v1/plasmids',
            method='POST',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    @unittest.skip("Connexion 3 requires the handler to specify which content type to return when an operation declares multiple response content types; the auto-generated stub does not, so calling it raises a 500 until the operation is actually implemented.")
    def test_list_plasmids(self):
        """Test case for list_plasmids

        Get all the contents of the plasmids collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/plasmids',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    @unittest.skip("multipart/form-data not supported by Connexion")
    def test_replace_plasmids(self):
        """Test case for replace_plasmids

        Replace the plasmids collection contents
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
            '/api/v1/plasmids',
            method='PUT',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    unittest.main()
