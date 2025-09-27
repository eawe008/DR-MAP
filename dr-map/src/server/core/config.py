"""Core configuration helpers and constants."""

from pathlib import Path
import yaml

CONFIG_DIR = Path(__file__).parents[1] / "config"
COST_SCALE = [5, 10, 15, 30, 50, 150]
EMERGENCY_MIN_COST = 30


def load_config() -> dict:
    """Load optional YAML config for tests.

    Returns:
        dict: Config with keys like 'cost_scale'. Falls back to defaults if missing.
    """
    path = CONFIG_DIR / "tests.yaml"
    try:
        data = yaml.safe_load(path.read_text())
        if not isinstance(data, dict):
            raise ValueError("tests.yaml must parse to a dict")
        return data
    except FileNotFoundError:
        return {"cost_scale": COST_SCALE}
    except Exception:
        return {"cost_scale": COST_SCALE}
