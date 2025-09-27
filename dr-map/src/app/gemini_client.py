import os
import requests

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

def call_gemini(prompt_text):
    """
    Sends a prompt to Gemini and returns the response JSON.
    """
    headers = {
        "Authorization": f"Bearer {GEMINI_API_KEY}",
        "Content-Type": "application/json"
    }
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt_text}]
            }
        ]
    }
    response = requests.post(GEMINI_URL, json=body, headers=headers)
    response.raise_for_status()
    return response.json()