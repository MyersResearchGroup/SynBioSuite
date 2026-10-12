# coding: utf-8

from __future__ import absolute_import

from flask import json
from six import BytesIO

from swagger_server.models.error import Error  # noqa: E501
from swagger_server.models.item import Item  # noqa: E501
from swagger_server.models.mutation_result import MutationResult  # noqa: E501
from swagger_server.test import BaseTestCase


class TestDesignsController(BaseTestCase):
    """DesignsController integration test stubs"""

    def test_clear_designs(self):
        """Test case for clear_designs

        Empty the designs collection
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        response = self.client.open(
            '/designs',
            method='DELETE',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_create_designs(self):
        """Test case for create_designs

        Add to the designs collection
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        data = dict(file='file_example',
                    params='params_example')
        response = self.client.open(
            '/designs',
            method='POST',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_list_designs(self):
        """Test case for list_designs

        Get all the contents of the designs collection
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        response = self.client.open(
            '/designs',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_replace_designs(self):
        """Test case for replace_designs

        Replace the designs collection contents
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        data = dict(file='file_example',
                    params='params_example')
        response = self.client.open(
            '/designs',
            method='PUT',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
