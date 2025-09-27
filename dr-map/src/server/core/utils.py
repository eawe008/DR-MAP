"""General utilities: red-flag detection and cost ladder helpers."""

from typing import List
from .config import COST_SCALE, EMERGENCY_MIN_COST

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


def has_red_flags(symptoms: List[str]) -> bool:
    """Return True if any emergency red flags appear in the symptom text."""
    text = " ".join(map(str, symptoms)).lower()
    return any(p in text for p in RED_FLAG_PATTERNS)


def next_allowed_cost(min_cost: int) -> int:
    """Get the next rung on COST_SCALE strictly greater than min_cost."""
    for c in COST_SCALE:
        if c > min_cost:
            return c
    return COST_SCALE[-1]
