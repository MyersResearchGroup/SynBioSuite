"""The bulk, collection-level REST API served at /api/v1.

Collection-level GET / POST / PUT / DELETE over the object types SynBioSuite
models, scoped to one study by the X-Study-Collection header, with SynBioHub as
the datastore. Per-item access is delegated to SynBioHub itself, except for
PATCH /assays/<id>/attachments, which must name the object it attaches to.

The routes are bound to these handlers in route.py (build_api_blueprint).
"""
