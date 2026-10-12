# coding: utf-8

import sys
from setuptools import setup, find_packages

NAME = "swagger_server"
VERSION = "1.0.0"
# To install the library, run the following
#
# python setup.py install
#
# prerequisite: setuptools
# http://pypi.python.org/pypi/setuptools

REQUIRES = [
    "connexion",
    "swagger-ui-bundle>=0.0.2"
]

setup(
    name=NAME,
    version=VERSION,
    description="SynBioSuite API",
    author_email="",
    url="",
    keywords=["Swagger", "SynBioSuite API"],
    install_requires=REQUIRES,
    packages=find_packages(),
    package_data={'': ['swagger/swagger.yaml']},
    include_package_data=True,
    entry_points={
        'console_scripts': ['swagger_server=swagger_server.__main__:main']},
    long_description="""\
    Bulk, collection-level REST API for SynBioSuite. Each collection exposes GET (get all contents), POST (add), PUT (replace all contents), and DELETE (empty). Excel-backed collections also expose GET /template.  Per-item access (fetch or edit a single object by id) is delegated to the SynBioHub API, which is the system of record for individual objects. The one exception is PATCH /assays/{id}/attachments, which attaches a file to a specific SBOL object and therefore must name that object.  Every request carries the study it applies to in the X-Study-Collection header (the SynBioHub collection selected when opening SynBioSuite). That study scopes all collections, which is why this API needs no per-item ids elsewhere. Because the SynBioHub API host differs from the host in that collection URI (api.synbiohub.org vs synbiohub.org), the API base is supplied separately in X-SynBioHub-Url.  Uploads take a single &#x60;file&#x60; part. Collections that accept both formats detect which from the file extension; Excel is converted to SBOL on ingest.  DELETE empties a collection by removing its members&#x27; membership. The sub-collection object survives and the SBOL objects themselves are not destroyed, so a subsequent GET returns an empty array rather than 404. A 404 means the study collection itself does not exist.  This version number is the API contract&#x27;s; GET /status reports the running backend&#x27;s version, which is tracked separately.  TBD collections, present but not yet specified: /models (SBML), /archives (OMEX), /analyses (iBioSim). They answer 501.  Trying it out: open these docs from a running server, click Authorize and paste a SynBioHub token, then on any operation click Try it out, paste your study&#x27;s collection URI into X-Study-Collection, and Execute. Leave X-SynBioHub-Url blank -- the server derives https://api.&lt;study host&gt;. PUT and DELETE change real data; point them at a scratch study. 
    """
)
