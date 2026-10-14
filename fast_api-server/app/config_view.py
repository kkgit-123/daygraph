"""Typed view of the [daygraph] config section."""
import config


def dg_config() -> dict:
    cfg = dict(config.get_config().get("daygraph", {}))
    cfg.setdefault("google_mode", "mock")
    cfg.setdefault("llm_mode", "mock")
    cfg.setdefault("workspace_name", "Payments launch")
    cfg.setdefault("workspace_subtitle", "5 people in 5 cities")
    return cfg
