"""The generated /api/v1 server and the legacy /api/* routes, as one application.

Connexion routes, authenticates and validates /api/v1 from the OpenAPI spec
(static/openapi.yaml) and calls the generated controllers, which forward to
api/impl. The legacy routes are registered on Connexion's underlying Flask app.

`connexion_app` is an ASGI application. `application` is the same thing behind
a WSGI adapter, for uwsgi.
"""
import connexion
from a2wsgi import ASGIMiddleware
from connexion.middleware import MiddlewarePosition
from connexion.options import SwaggerUIOptions
from connexion.resolver import Resolver
from connexion.utils import get_function_from_name
from flask_swagger_ui import get_swaggerui_blueprint
from inflection import underscore
from starlette.middleware.cors import CORSMiddleware

import openapi_server.impl

# Transitional: the legacy routes are still defined against main.app (route.py),
# so they are read off it. Once main.py builds this application, they can be
# registered here directly.
from . import main as legacy
from . import route as legacy_routes
from .api import connexion_errors, impl
from .errors import ApiError

SPEC_DIR = 'static'
SPEC_FILE = 'openapi.yaml'

# Same pages main.py serves; Connexion's own Swagger UI is switched off.
DOCS = (('docs', '/api/docs'), ('v1_docs', '/api/v1/docs'))


def create_app() -> connexion.FlaskApp:
    openapi_server.impl.bind(impl)

    app = connexion.FlaskApp(__name__, specification_dir=SPEC_DIR)
    # Outside the exception handling, so error responses carry the headers too.
    app.add_middleware(
        CORSMiddleware,
        position=MiddlewarePosition.BEFORE_EXCEPTION,
        allow_origins=['*'],
        allow_methods=['*'],
        allow_headers=['*'],
    )
    app.add_api(
        SPEC_FILE,
        resolver=Resolver(_generated_function),
        pythonic_params=True,
        swagger_ui_options=SwaggerUIOptions(swagger_ui=False, serve_spec=False),
    )
    connexion_errors.register(app)
    _register_legacy(app.app)
    return app


def _generated_function(name: str):
    """The generated controller function for `<module>.<operationId>`.

    The spec's operationIds are camelCase; the generator writes the functions
    in snake_case.
    """
    module, _, operation_id = name.rpartition('.')
    return get_function_from_name(f'{module}.{underscore(operation_id)}')


def _register_legacy(flask_app):
    """The legacy /api/* routes and the docs pages, as main.app has them."""
    flask_app.config['MAX_CONTENT_LENGTH'] = legacy.app.config['MAX_CONTENT_LENGTH']
    flask_app.register_error_handler(ApiError, legacy_routes.handle_api_error)

    for rule in legacy.app.url_map.iter_rules():
        # Blueprint endpoints (the old /api/v1, the docs) and static are not
        # the legacy routes.
        if '.' in rule.endpoint or rule.endpoint == 'static':
            continue
        flask_app.add_url_rule(
            rule.rule,
            endpoint=rule.endpoint,
            view_func=legacy.app.view_functions[rule.endpoint],
            methods=rule.methods,
        )

    for name, url in DOCS:
        flask_app.register_blueprint(
            get_swaggerui_blueprint(url, legacy.API_URL, config=legacy.SWAGGER_UI_CONFIG),
            name=name,
            url_prefix=url,
        )


connexion_app = create_app()
application = ASGIMiddleware(connexion_app)
