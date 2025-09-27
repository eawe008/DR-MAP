import os, json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import yaml
from pathlib import Path

CONFIG_DIR = Path(__file__).parent / "config"


def load_config():
    path = CONFIG_DIR / "tests.yaml"
    try:
        data = yaml.safe_load(path.read_text())
        if not isinstance(data, dict):
            raise ValueError("tests.yaml must parse to a dict")
        return data
    except FileNotFoundError:
        # fallback to sane defaults if file is missing
        return {"cost_scale": [5, 10, 15, 30, 50, 150]}
    except Exception as e:
        print("Failed to load config:", e)
        # fallback
        return {"cost_scale": [5, 10, 15, 30, 50, 150]}


RED_FLAG_PATTERNS = [
    "heart attack",
    "chest pain",
    "heart pain",
    "shortness of breath at rest",
    "severe shortness of breath",
    "blue lips",
    "confusion",
    "fainting",
    "seizure",
    "stiff neck with fever",
    "fever over 103",
    "severe headache with fever",
    "focal weakness",
    "one-sided weakness",
]
EMERGENCY_MIN_COST = 30


def has_red_flags(symptoms: list[str]) -> bool:
    text = " ".join(map(str, symptoms)).lower()
    return any(p in text for p in RED_FLAG_PATTERNS)


tests_cfg = load_config()


load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": os.getenv("ALLOWED_ORIGIN", "*")}})

COST_SCALE = [5, 10, 15, 30, 50, 150]


def next_allowed_cost(min_cost: int) -> int:
    """Return the lowest cost in COST_SCALE that is strictly > min_cost."""
    for c in COST_SCALE:
        if c > min_cost:
            return c
    return COST_SCALE[-1]


@app.route("/receive", methods=["POST"])
def receive_data():
    try:
        # Get JSON body
        data = request.get_json()

        # Validate it's a list of strings
        if not isinstance(data, list) or not all(
            isinstance(item, str) for item in data
        ):
            return jsonify({"error": "Expected JSON array of strings"}), 400

        # Now 'data' is your Python list of strings
        print("Received:", data)

        # Example: process or store it
        collected_data = [s.upper() for s in data]

        return (
            jsonify(
                {
                    "status": "success",
                    "received_count": len(data),
                    "processed": collected_data,
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/")
def health():
    return "server working"


def recommend_next_test(symptoms, previous_tests, min_cost):
    """
    Returns:
      {
        "test_name": str,
        "description": str,
        "cost_weight": int,
        "diseases": [str, str]
      }
    """
    # Track prior names to avoid repeats
    seen_names = {
        (t.get("test_name") or "").strip().lower()
        for t in previous_tests
        if isinstance(t, dict)
    }
    prior_summary = [
        {
            "test_name": t.get("test_name", ""),
            "result": t.get("result", ""),
            "cost_weight": t.get("cost_weight", None),
        }
        for t in previous_tests
        if isinstance(t, dict)
    ]

    system = (
        "You are a medical decision-support assistant. "
        "Respond with VALID JSON only (no text outside JSON). "
        "Do NOT give treatment or definitive diagnoses."
    )

    # Clear rules including cost ladder usage
    rules = [
        "Always consider common diseases before rare ones.",
        "Prefer low-cost, non-invasive screening tests first; escalate only if needed.",
        "Balance information gain with low cost and common prevalence.",
        f"Only suggest tests with a cost strictly greater than min_cost ({min_cost}).",
        f"Pick cost_weight from COST_SCALE = {COST_SCALE}.",
        "Choose the LOWEST value in COST_SCALE that is strictly greater than min_cost and still reasonable.",
        "Never jump to expensive/specialized tests unless emergency red flags are present (e.g., severe chest pain, hypoxia, confusion, focal neurological deficit).",
        "Return STRICT JSON with fields: test_name, description, cost_weight, diseases (array of exactly two short names).",
    ]

    user_payload = {
        "symptoms": symptoms,
        "previous_tests": prior_summary or [],
        "min_cost": min_cost,
        "constraints": rules,
        "format": {
            "type": "object",
            "example": {
                "test_name": "Pulse oximetry",
                "description": "Non-invasive estimate of oxygen saturation using a fingertip device.",
                "cost_weight": 5,
                "diseases": ["Influenza", "Common cold"],
            },
        },
    }

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(user_payload)},
        ],
    )

    # --- Parse & sanitize model output ---
    text = resp.choices[0].message.content.strip()
    if not text.startswith("{"):
        s = text.find("{")
        if s >= 0:
            text = text[s:]
    if not text.endswith("}"):
        e = text.rfind("}")
        if e >= 0:
            text = text[: e + 1]

    data = json.loads(text)

    test_name = str(data.get("test_name", "")).strip()
    description = str(data.get("description", "")).strip()

    # Coerce cost -> int
    cw_raw = data.get("cost_weight", 0)
    try:
        cost_weight = int(cw_raw)
    except Exception:
        try:
            cost_weight = int(float(str(cw_raw).strip()))
        except Exception:
            cost_weight = 0  # will be corrected below

    # current parsed cost_weight ...
    floor = int(min_cost)
    if has_red_flags(symptoms):
        floor = max(floor, EMERGENCY_MIN_COST)

    # snap using the (possibly raised) floor
    if cost_weight not in COST_SCALE or cost_weight <= floor:
        cost_weight = next_allowed_cost(floor)

    if cost_weight not in COST_SCALE or cost_weight <= int(min_cost):
        cost_weight = next_allowed_cost(int(min_cost))

    # Avoid repeating prior test names
    if test_name.lower() in seen_names:
        test_name = f"Follow-up: {test_name}"

    # Ensure exactly 2 diseases
    diseases = data.get("diseases", [])
    if not isinstance(diseases, list):
        diseases = []
    diseases = [str(x).strip() for x in diseases if str(x).strip()]
    if len(diseases) < 2:
        diseases += ["Undifferentiated"] * (2 - len(diseases))
    diseases = diseases[:2]

    return {
        "test_name": test_name,
        "description": description,
        "cost_weight": cost_weight,
        "diseases": diseases,
    }


@app.post("/api/next-test")
def next_test():
    body = request.get_json(silent=True) or {}
    symptoms = body.get("symptoms", [])
    previous_tests = body.get("previous_tests", [])
    min_cost = body.get("min_cost", 0)

    if not isinstance(symptoms, list) or not symptoms:
        return jsonify({"error": "Provide symptoms: string[]"}), 400
    if not isinstance(previous_tests, list):
        return jsonify({"error": "previous_tests must be an array"}), 400
    if not isinstance(min_cost, (int, float)):
        return jsonify({"error": "min_cost must be a number"}), 400

    result = recommend_next_test(symptoms, previous_tests, min_cost)
    return jsonify(result)


if __name__ == "__main__":
    print("Loaded COST_SCALE:", COST_SCALE)
    print("Routes:\n", app.url_map)
    app.run(debug=True, port=5000)
