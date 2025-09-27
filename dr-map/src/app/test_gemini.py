import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pathlib import Path
import json

# --- Environment Setup ---
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
print("Gemini key loaded: ", GEMINI_API_KEY is not None)

app = Flask(__name__)
CORS(app)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

@app.route("/test_gemini", methods=["POST"])
def test_gemini():
    data = request.json
    symptoms_text = data.get("symptoms", "abdominal pain, nausea")

    prompt = f"""
You are a clinical assistant.
Patient symptoms: {symptoms_text}.
Suggest 3 commonly ordered diagnostic tests. Return JSON with keys: "tests" (array of test names) and "reasoning" (brief explanation).
"""

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
    }

    body = {
        "contents": [
            {"role": "user", "parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    # Make the request
    response = requests.post(GEMINI_URL, headers=headers, json=body)
    resp_json = response.json()

    # Extract text from the first candidate
    try:
        text_output = resp_json["candidates"][0]["content"]["parts"][0]["text"]
        # Attempt to parse as JSON
        parsed = json.loads(text_output)
    except (KeyError, IndexError, json.JSONDecodeError):
        # Fallback: return raw text if parsing fails
        parsed = {"raw_text": text_output}

    return jsonify(parsed)


if __name__ == "__main__":
    app.run(debug=True)
