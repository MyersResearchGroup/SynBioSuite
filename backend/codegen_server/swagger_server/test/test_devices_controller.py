# coding: utf-8

from __future__ import absolute_import

from flask import json
from six import BytesIO

from swagger_server.models.error import Error  # noqa: E501
from swagger_server.models.item import Item  # noqa: E501
from swagger_server.models.mutation_result import MutationResult  # noqa: E501
from swagger_server.test import BaseTestCase


class TestDevicesController(BaseTestCase):
    """DevicesController integration test stubs"""

    def test_clear_devices(self):
        """Test case for clear_devices

        Empty the devices collection
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        response = self.client.open(
            '/devices',
            method='DELETE',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_create_devices(self):
        """Test case for create_devices

        Add to the devices collection
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        data = dict(file='file_example',
                    params='params_example')
        response = self.client.open(
            '/devices',
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
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        response = self.client.open(
            '/devices',
            method='GET',
            headers=headers)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_replace_devices(self):
        """Test case for replace_devices

        Replace the devices collection contents
        """
        headers = [('x_study_collection', 'x_study_collection_example'),
                   ('x_syn_bio_hub_url', 'x_syn_bio_hub_url_example')]
        data = dict(file='file_example',
                    params='params_example')
        response = self.client.open(
            '/devices',
            method='PUT',
            headers=headers,
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
