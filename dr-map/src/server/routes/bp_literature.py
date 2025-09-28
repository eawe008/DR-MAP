# server/routes/bp_literature.py
from flask import Blueprint, request, jsonify
from server.literature.fetcher import LiteratureFetcher

bp = Blueprint("literature", __name__, url_prefix="/literature")

@bp.route("", methods=["POST"])
def get_literature():
    data = request.get_json()
    keywords = data.get("keywords", [])

    if not keywords:
        return jsonify({"error": "No keywords provided"}), 400

    fetcher = LiteratureFetcher(source="EuropePMC")
    articles = fetcher.search(keywords, max_results=3)

    return jsonify(articles), 200
