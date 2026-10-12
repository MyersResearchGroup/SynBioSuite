import unittest

from flask import json

from openapi_server.models.error import Error  # noqa: E501
from openapi_server.test import BaseTestCase


class TestArchivesController(BaseTestCase):
    """ArchivesController integration test stubs"""

    def test_clear_archives(self):
        """Test case for clear_archives

        [TBD] Empty the archives collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/archives',
            method='DELETE',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_create_archives(self):
        """Test case for create_archives

        [TBD] Add to the archives collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/archives',
            method='POST',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_list_archives(self):
        """Test case for list_archives

        [TBD] Get all the contents of the archives collection
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/archives',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_replace_archives(self):
        """Test case for replace_archives

        [TBD] Replace the archives collection contents
        """
        headers = { 
            'Accept': 'application/json',
            'x_study_collection': 'https://synbiohub.org/user/alice/MyStudy/MyStudy_collection/1',
            'x_syn_bio_hub_url': 'https://api.synbiohub.org',
            'Authorization': 'Bearer special-key',
        }
        response = self.client.open(
            '/api/v1/archives',
            method='PUT',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    unittest.main()
