import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from gemini_client import call_gemini
from prompt_builder import build_test_prompt

app = Flask(__name__)
CORS(app)

# pLACEHOLD TEST MAPPING (TO BE REPLACED WITH DB/JSON later)
with open("test_mapppings.json") as f:
    TEST_REFERENCE = json.load(f)

@app.route("/recommend_tests", methods=["POST"])
def recommend_tests():
    data = request.json
    symptoms_text = data.get("symptoms", "")

    #TEMP: simple split to simulate symptom normalization
    symptoms_list = [s.strip() for s in symptoms_text.lower().split(",")]

    #TEMP: get allowed tests from placehold mapping
    allowed_tests = []
    for symptom in symptoms_list:
        allowed_tests.extend(TEST_REFERENCE.GET(symptom, []))
    allowed_tests = list(set(allowed_tests))

    #Build prompt for Gemini
    prompt = build_test_prompt(symptoms_list, allowed_tests)

    #Call Gemini API
    response = call_gemini(prompt)
    return jsonify(response)