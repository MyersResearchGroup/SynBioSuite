# coding: utf-8

from __future__ import absolute_import

from flask import json
from six import BytesIO

from swagger_server.models.error import Error  # noqa: E501
from swagger_server.test import BaseTestCase


class TestModelsController(BaseTestCase):
    """ModelsController integration test stubs"""

    def test_clear_models(self):
        """Test case for clear_models

        [TBD] Empty the models collection
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        response = self.client.open(
            '/models',
            method='DELETE',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_create_models(self):
        """Test case for create_models

        [TBD] Add to the models collection
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        response = self.client.open(
            '/models',
            method='POST',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_list_models(self):
        """Test case for list_models

        [TBD] Get all the contents of the models collection
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        response = self.client.open(
            '/models',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_replace_models(self):
        """Test case for replace_models

        [TBD] Replace the models collection contents
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        response = self.client.open(
            '/models',
            method='PUT',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
