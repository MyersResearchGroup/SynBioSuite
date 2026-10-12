# coding: utf-8

from __future__ import absolute_import

from flask import json
from six import BytesIO

from swagger_server.models.error import Error  # noqa: E501
from swagger_server.models.item import Item  # noqa: E501
from swagger_server.models.mutation_result import MutationResult  # noqa: E501
from swagger_server.test import BaseTestCase


class TestStrainsController(BaseTestCase):
    """StrainsController integration test stubs"""

    def test_clear_strains(self):
        """Test case for clear_strains

        Empty the strains collection
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        response = self.client.open(
            '/strains',
            method='DELETE',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_create_strains(self):
        """Test case for create_strains

        Add to the strains collection
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        data = dict(file='file_example',
                    params='params_example')
        response = self.client.open(
            '/strains',
            method='POST',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_get_strains_template(self):
        """Test case for get_strains_template

        Download the blank Excel template for strains
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        response = self.client.open(
            '/strains/template',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_list_strains(self):
        """Test case for list_strains

        Get all the contents of the strains collection
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        response = self.client.open(
            '/strains',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_replace_strains(self):
        """Test case for replace_strains

        Replace the strains collection contents
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        data = dict(file='file_example',
                    params='params_example')
        response = self.client.open(
            '/strains',
            method='PUT',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
