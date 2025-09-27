"""Misc routes: health and simple echo endpoint."""

from typing import List
from flask import Blueprint, jsonify, request

bp = Blueprint("misc", __name__)


@bp.get("/")
def health() -> str:
    """Liveness endpoint."""
    return "server working"


@bp.post("/receive")
def receive_data():
    """Echo a list of strings, uppercased.

    Request JSON:
        ["fever", "cough"]

    Response JSON:
        {"status":"success","received_count":2,"processed":["FEVER","COUGH"]}
    """
    data = request.get_json()
    if not isinstance(data, list) or not all(isinstance(x, str) for x in data):
        return jsonify({"error": "Expected JSON array of strings"}), 400
    return (
        jsonify(
            {
                "status": "success",
                "received_count": len(data),
                "processed": [s.upper() for s in data],
            }
        ),
        200,
    )
