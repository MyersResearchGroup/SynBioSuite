import unittest

from flask import json

from openapi_server.models.error import Error  # noqa: E501
from openapi_server.models.item import Item  # noqa: E501
from openapi_server.models.mutation_result import MutationResult  # noqa: E501
from openapi_server.test import BaseTestCase


class TestAssaysController(BaseTestCase):
    """AssaysController integration test stubs"""

    @unittest.skip("multipart/form-data not supported by Connexion")
    def test_attach_to_assay(self):
        """Test case for attach_to_assay

        Add a new attachment to the pointed SBOL object
        """
        headers = { 
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        data = dict(file='/path/to/file')
        response = self.client.open(
            '/api/v1/assays/{id}/attachments'.format(id='id_example'),
            method='PATCH',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_clear_assays(self):
        """Test case for clear_assays

        Empty the assays collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/assays',
            method='DELETE',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    @unittest.skip("multipart/form-data not supported by Connexion")
    def test_create_assays(self):
        """Test case for create_assays

        Add to the assays collection
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
            '/api/v1/assays',
            method='POST',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_get_assays_template(self):
        """Test case for get_assays_template

        Download the blank Excel template for assays
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/assays/template',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_list_assays(self):
        """Test case for list_assays

        Get all the contents of the assays collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/assays',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    @unittest.skip("multipart/form-data not supported by Connexion")
    def test_replace_assays(self):
        """Test case for replace_assays

        Replace the assays collection contents
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
            '/api/v1/assays',
            method='PUT',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    unittest.main()
