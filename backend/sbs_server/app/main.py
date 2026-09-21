import mimetypes
import os

from flask import Flask
from flask_cors import CORS
from flask_swagger_ui import get_swaggerui_blueprint

# Python's mimetypes table has no entry for .yaml, so Flask would serve the spec
# as application/octet-stream. Swagger UI copes, but tools that import a spec by
# URL (Postman, code generators) go by the content type.
mimetypes.add_type('application/yaml', '.yaml')

# Create the Flask app only ONCE
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Cap uploads. Workbooks run a few hundred KB and SBOL files less, so 64 MB is
# generous; without a cap an arbitrarily large body is buffered into a worker.
# Override per deployment with SBS_MAX_UPLOAD_MB.
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('SBS_MAX_UPLOAD_MB', '64')) * 1024 * 1024

# Configure Swagger UI. The spec lives beside the code it describes, so it is
# version-controlled with it; the previous static/swagger.json documented seven
# endpoints that no longer existed and has been removed.
API_URL = '/static/openapi.yaml'

# Passed straight through to Swagger UI. tryItOutEnabled is deliberately left
# off: the per-operation "Try it out" click is the only speed bump before an
# Execute on DELETE or PUT.
SWAGGER_UI_CONFIG = {
    'app_name': "SynBioSuite API",
    'persistAuthorization': True,    # the token survives page reloads
    'displayRequestDuration': True,  # makes SynBioHub latency visible
    'requestSnippetsEnabled': True,  # shows the equivalent curl per request
    'filter': True,                  # search box across the operations
}

for name, swagger_url in (('docs', '/api/docs'), ('v1_docs', '/api/v1/docs')):
    app.register_blueprint(
        get_swaggerui_blueprint(
            swagger_url,
            API_URL,
            config=SWAGGER_UI_CONFIG,
        ),
        name=name,           # both blueprints default to 'swagger_ui'
        url_prefix=swagger_url,
    )

# Import views AFTER creating app and registering Swagger UI
# This ensures your routes take precedence in case of conflicts
from . import route

# Bulk collection API (/api/v1). Registered after the legacy /api/* routes so
# those keep precedence; the two surfaces do not overlap.
from .api import build_api_blueprint

app.register_blueprint(build_api_blueprint())

if __name__ == "__main__":
    # Only for debugging while developing
    app.run(host='0.0.0.0', debug=True, port=5003)