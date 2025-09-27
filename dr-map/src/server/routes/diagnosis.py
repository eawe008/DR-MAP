"""Diagnosis API routes."""

from flask import Blueprint, jsonify, request
from typing import List, Dict
from ..services.recommender import get_multiple_tests

bp = Blueprint("diagnosis", __name__, url_prefix="/api")


@bp.route("/next-test", methods=["OPTIONS"])
def next_test_options():
    """Handle preflight OPTIONS request for CORS."""
    return "", 200

allSymptoms = []
@bp.post("/next-test")
def next_test():
    """Return possible diseases (from first/best test) and two test objects.

    Request JSON:
        {
          "symptoms": ["fever","cough"],
          "previous_tests": [],
          "min_cost": 0,
          "n": 2
        }

    Response JSON:
        {
          "diseases": ["Influenza","COVID-19"],
          "tests": [
            {"test_name": "...", "test_description": "...", "cost_weight": 5},
            {"test_name": "...", "test_description": "...", "cost_weight": 10}
          ]
        }
    """
    body = request.get_json(silent=True) or {}
    symptoms: List[str] = body.get("symptoms", [])
    allSymptoms.extend(symptoms)
    print("All symptoms so far:", allSymptoms)
    previous_tests: List[Dict] = body.get("previous_tests", [])
    min_cost = body.get("min_cost", 0)
    n = int(body.get("n", 2))

    if not isinstance(symptoms, list) or not symptoms:
        return jsonify({"error": "Provide symptoms: string[]"}), 400
    if not isinstance(previous_tests, list):
        return jsonify({"error": "previous_tests must be an array"}), 400
    if not isinstance(min_cost, (int, float)):
        return jsonify({"error": "min_cost must be a number"}), 400

    tests_full = get_multiple_tests(symptoms, previous_tests, int(min_cost), n=n)
    diseases_top = tests_full[0]["diseases"] if tests_full else []

    tests_slim = [
        {
            "test_name": t["test_name"],
            "test_description": t["test_description"],
            "cost_weight": t["cost_weight"],
        }
        for t in tests_full
    ]
    return jsonify({"allSymptoms": allSymptoms, "diseases": diseases_top, "tests": tests_slim}), 200
