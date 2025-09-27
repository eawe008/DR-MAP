"""Flask app entrypoint and application factory.

Run in package mode:
    cd src
    python -m server.app
"""

from flask import Flask
from .core.cors import configure_cors
from .routes import register_blueprints


def create_app() -> Flask:
    """Create and configure the Flask application.

    Returns:
        Flask: Configured app with CORS and registered blueprints.
    """
    app = Flask(__name__)
    configure_cors(app, origin="http://localhost:3000")
    register_blueprints(app)
    return app


if __name__ == "__main__":
    app = create_app()
    print("Routes:\n", app.url_map)
    app.run(debug=True, port=5050)
