"""Blueprint registration."""

from .diagnosis import bp as diagnosis_bp
from .misc import bp as misc_bp
from .bp_literature import bp as literature_bp


def register_blueprints(app) -> None:
    """Attach all blueprints to the app."""
    app.register_blueprint(misc_bp)
    app.register_blueprint(diagnosis_bp)
    app.register_blueprint(literature_bp)