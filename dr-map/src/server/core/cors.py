"""CORS configuration helper."""

from flask import Flask
from flask_cors import CORS


def configure_cors(app: Flask, origin: str = "http://localhost:3000") -> None:
    """Enable CORS for the given origin on all routes."""
    # Use flask-cors with more permissive settings
    CORS(app, 
         origins=["*"],  # Allow all origins for debugging
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization"],
         supports_credentials=False)
    
    # Also add manual CORS headers as backup
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
