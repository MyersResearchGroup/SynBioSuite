from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Import views after creating app instance
    from . import views
    
    # Import and register any blueprints here if you use them
    
    return app