import os, json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import yaml
from pathlib import Path

# ---------- Config & constants ----------
CONFIG_DIR = Path(__file__).parent / "config"


def load_config():
    path = CONFIG_DIR / "tests.yaml"
    try:
        data = yaml.safe_load(path.read_text())
        if not isinstance(data, dict):
            raise ValueError("tests.yaml must parse to a dict")
        return data
    except FileNotFoundError:
        return {"cost_scale": [5, 10, 15, 30, 50, 150]}
    except Exception as e:
        print("Failed to load config:", e)
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
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

COST_SCALE = [5, 10, 15, 30, 50, 150]


def next_allowed_cost(min_cost: int) -> int:
    """Return the lowest cost in COST_SCALE that is strictly > min_cost."""
    for c in COST_SCALE:
        if c > min_cost:
            return c
    return COST_SCALE[-1]


# ---------- Simple echo endpoint (optional) ----------
@app.route("/receive", methods=["POST"])
def receive_data():
    try:
        data = request.get_json()
        if not isinstance(data, list) or not all(
            isinstance(item, str) for item in data
        ):
            return jsonify({"error": "Expected JSON array of strings"}), 400
        processed = [s.upper() for s in data]
        return (
            jsonify(
                {
                    "status": "success",
                    "received_count": len(data),
                    "processed": processed,
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/")
def health():
    return "server working"


# ---------- Core recommendation ----------
def recommend_next_test(symptoms, previous_tests, min_cost):
    """
    Returns a dict:
      {
        "test_name": str,
        "description": str,
        "cost_weight": int,          # one of COST_SCALE
        "diseases": [str, str]       # exactly two strings
      }
    """
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

    # Softer rule: let the model pick any clinically reasonable cost > min_cost.
    system = (
        "You are a medical decision-support assistant. "
        "Respond with VALID JSON only (no text outside JSON). "
        "Do NOT give treatment or definitive diagnoses."
    )
    rules = [
        "Always consider common diseases before rare ones.",
        "Prefer low-cost, non-invasive screening tests first; escalate only if needed.",
        "Balance information gain with low cost and common prevalence.",
        f"Only suggest tests with a cost strictly greater than min_cost ({min_cost}).",
        f"Pick cost_weight from COST_SCALE = {COST_SCALE}.",
        "Choose a cost_weight from COST_SCALE that is clinically reasonable given the context; it must be strictly greater than min_cost.",
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
        temperature=0.0,  # deterministic
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
        text = text[s:] if s >= 0 else "{}"
    if not text.endswith("}"):
        e = text.rfind("}")
        text = text[: e + 1] if e >= 0 else "{}"

    data = json.loads(text)

    test_name = str(data.get("test_name", "")).strip()
    description = str(data.get("description", "")).strip()

    # Coerce/snap cost -> int within COST_SCALE and > floor
    cw_raw = data.get("cost_weight", 0)
    try:
        cost_weight = int(cw_raw)
    except Exception:
        try:
            cost_weight = int(float(str(cw_raw).strip()))
        except Exception:
            cost_weight = 0

    floor = int(min_cost)
    if has_red_flags(symptoms):
        floor = max(floor, EMERGENCY_MIN_COST)

    # Snap to next allowed rung if invalid or <= floor
    if cost_weight not in COST_SCALE or cost_weight <= floor:
        # If model chose a rung in scale but <= floor, bump to next;
        # else choose next >= floor+1
        cost_weight = next_allowed_cost(floor)

    # Avoid repeating prior names
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


def get_multiple_tests(symptoms, previous_tests, min_cost, n=2, max_tries=8):
    """
    Ask the model up to n times with the SAME min_cost (model decides cost).
    Dedup by test_name. Pads if needed.
    Returns list of dicts: {test_name, test_description, cost_weight, diseases}
    """
    results = []
    seen = set()
    tries = 0
    floor = int(min_cost)

    while len(results) < n and tries < max_tries:
        rec = recommend_next_test(symptoms, previous_tests, floor)
        name_key = rec["test_name"].strip().lower()
        if name_key and name_key not in seen:
            results.append(
                {
                    "test_name": rec["test_name"],
                    "test_description": rec["description"],
                    "cost_weight": rec["cost_weight"],
                    "diseases": rec["diseases"],
                }
            )
            seen.add(name_key)
        # else: duplicate → just try again without changing floor
        tries += 1

    while len(results) < n:
        # Fallback padding keeps schema stable
        results.append(
            {
                "test_name": "Polymerase chain reaction (PCR) test",
                "test_description": "A highly sensitive test that detects viral genetic material in respiratory specimens.",
                "cost_weight": next_allowed_cost(floor),
                "diseases": ["Undifferentiated", "Undifferentiated"],
            }
        )

    return results[:n]


# ---------- Public API ----------
@app.post("/api/next-test")
def next_test():
    try:
        body = request.get_json(silent=True) or {}
        symptoms = body.get("symptoms", [])
        previous_tests = body.get("previous_tests", [])
        min_cost = body.get("min_cost", 0)
        n = int(body.get("n", 2))  # default 2

        if not isinstance(symptoms, list) or not symptoms:
            return jsonify({"error": "Provide symptoms: string[]"}), 400
        if not isinstance(previous_tests, list):
            return jsonify({"error": "previous_tests must be an array"}), 400
        if not isinstance(min_cost, (int, float)):
            return jsonify({"error": "min_cost must be a number"}), 400

        tests_full = get_multiple_tests(symptoms, previous_tests, int(min_cost), n=n)

        diseases_top = tests_full[0]["diseases"] if tests_full else []

        # Strip diseases from each test for UI (diseases live at top-level)
        tests_slim = [
            {
                "test_name": t["test_name"],
                "test_description": t["test_description"],
                "cost_weight": t["cost_weight"],
            }
            for t in tests_full
        ]

        return jsonify({"diseases": diseases_top, "tests": tests_slim}), 200

    except Exception as e:
        import traceback

        print("Error in /api/next-test:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ---------- Run ----------
if __name__ == "__main__":
    print("Loaded COST_SCALE:", COST_SCALE)
    print("Routes:\n", app.url_map)
    app.run(debug=True, port=5050)
