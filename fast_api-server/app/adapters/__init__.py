"""Adapter factories. The only place that decides mock vs live from config."""
import config

_llm = None
_gateway = None


def _mode(key: str) -> str:
    return config.get_config().get("daygraph", {}).get(key, "mock").strip().lower()


def get_llm():
    global _llm
    if _llm is None:
        if _mode("llm_mode") == "live":
            from app.adapters.llm.gemini import GeminiLLM

            _llm = GeminiLLM()
        else:
            from app.adapters.llm.mock import MockLLM

            _llm = MockLLM()
    return _llm


def get_gateway():
    global _gateway
    if _gateway is None:
        if _mode("google_mode") == "live":
            from app.adapters.google.live import LiveGateway

            _gateway = LiveGateway()
        else:
            from app.adapters.google.mock import MockGateway

            _gateway = MockGateway()
    return _gateway


def reset_adapters():
    """Tests and dev-reset: drop cached singletons."""
    global _llm, _gateway
    _llm = None
    _gateway = None
