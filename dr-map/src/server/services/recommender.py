"""Model-backed test recommendations with safety rails."""

from typing import Dict, List, Tuple
import os, json
from dotenv import load_dotenv
from openai import OpenAI
from ..core.config import COST_SCALE, EMERGENCY_MIN_COST
from ..core.utils import has_red_flags, next_allowed_cost

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def recommend_next_test(
    symptoms: List[str], previous_tests: List[dict], min_cost: int
) -> Dict:
    """Ask the model for one next test, then validate/snap fields.

    Returns:
        dict: {
            "test_name": str,
            "description": str,
            "cost_weight": int in COST_SCALE (> min_cost, raised for red flags),
            "diseases": [str, str]
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
            "cost_weight": t.get("cost_weight"),
        }
        for t in previous_tests
        if isinstance(t, dict)
    ]

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
        "Never jump to expensive/specialized tests unless emergency red flags are present.",
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
                "description": "Non-invasive estimate of oxygen saturation.",
                "cost_weight": 5,
                "diseases": ["Influenza", "Common cold"],
            },
        },
    }

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(user_payload)},
        ],
    )

    text = resp.choices[0].message.content.strip()
    if not text.startswith("{"):
        s = text.find("{")
        text = text[s:] if s >= 0 else "{}"
    if not text.endswith("}"):
        e = text.rfind("}")
        text = text[: e + 1] if e >= 0 else "{}"

    data = json.loads(text)

    # Extract + sanitize
    test_name = str(data.get("test_name", "")).strip()
    description = str(data.get("description", "")).strip()

    # Cost: coerce and snap to allowed rung (> floor)
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

    if cost_weight not in COST_SCALE or cost_weight <= floor:
        cost_weight = next_allowed_cost(floor)

    # Avoid repeats
    if test_name.lower() in seen_names:
        test_name = f"Follow-up: {test_name}"

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


def get_multiple_tests(
    symptoms: List[str],
    previous_tests: List[dict],
    min_cost: int,
    n: int = 2,
    max_tries: int = 8,
) -> List[Dict]:
    """Return up to n unique tests (model chooses cost each time).

    Dedups by test_name; pads if needed to keep a stable shape.

    Returns:
        list of dicts: each {
            "test_name", "test_description", "cost_weight", "diseases"
        }
    """
    results, seen, tries = [], set(), 0

    while len(results) < n and tries < max_tries:
        rec = recommend_next_test(symptoms, previous_tests, min_cost)
        key = rec["test_name"].strip().lower()
        if key and key not in seen:
            results.append(
                {
                    "test_name": rec["test_name"],
                    "test_description": rec["description"],
                    "cost_weight": rec["cost_weight"],
                    "diseases": rec["diseases"],
                }
            )
            seen.add(key)
        tries += 1

    while len(results) < n:
        results.append(
            {
                "test_name": "Polymerase chain reaction (PCR) test",
                "test_description": "A highly sensitive test that detects viral genetic material in respiratory specimens.",
                "cost_weight": next_allowed_cost(min_cost),
                "diseases": ["Undifferentiated", "Undifferentiated"],
            }
        )

    return results[:n]
