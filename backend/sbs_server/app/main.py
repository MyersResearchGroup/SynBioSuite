from flask import Flask
from flask_cors import CORS
from flask_swagger_ui import get_swaggerui_blueprint

# Create the Flask app only ONCE
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure Swagger UI
SWAGGER_URL = '/api/docs'  # URL for exposing Swagger UI
API_URL = '/static/swagger.json'  # Where to find your OpenAPI spec

swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    API_URL,
    config={'app_name': "sbs_api"}
)

# Register Swagger UI blueprint
app.register_blueprint(swaggerui_blueprint)

# Import views AFTER creating app and registering Swagger UI
# This ensures your routes take precedence in case of conflicts
from . import views

if __name__ == "__main__":
    # Only for debugging while developing
    app.run(host='0.0.0.0', debug=True, port=5003)