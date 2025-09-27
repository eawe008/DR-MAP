"""CORS configuration helper."""

from flask import Flask
from flask_cors import CORS


def configure_cors(app: Flask, origin: str = "http://localhost:3000") -> None:
    """Enable CORS for the given origin on all routes."""
    CORS(app, resources={r"/*": {"origins": origin}})
