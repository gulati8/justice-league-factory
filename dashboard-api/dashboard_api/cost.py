"""Cost calculation for factory agent runs.

Pricing is per-token in USD. Updated as of 2026-04-01.
Models are matched by prefix to handle versioned model IDs
(e.g., 'claude-opus-4-6-20250101' matches 'claude-opus-4-6').
"""

MODEL_PRICING: dict[str, dict[str, float]] = {
    "claude-opus-4-6": {
        "input": 15.0 / 1_000_000,
        "output": 75.0 / 1_000_000,
        "cache_read": 1.5 / 1_000_000,
        "cache_creation": 18.75 / 1_000_000,
    },
    "claude-sonnet-4-6": {
        "input": 3.0 / 1_000_000,
        "output": 15.0 / 1_000_000,
        "cache_read": 0.3 / 1_000_000,
        "cache_creation": 3.75 / 1_000_000,
    },
    "claude-haiku-4-5": {
        "input": 0.8 / 1_000_000,
        "output": 4.0 / 1_000_000,
        "cache_read": 0.08 / 1_000_000,
        "cache_creation": 1.0 / 1_000_000,
    },
}

_SORTED_PREFIXES = sorted(MODEL_PRICING.keys(), key=len, reverse=True)
_DEFAULT_MODEL = "claude-sonnet-4-6"


def _resolve_pricing(model: str | None) -> dict[str, float]:
    """Find pricing by prefix match. Falls back to Sonnet pricing."""
    if model:
        for prefix in _SORTED_PREFIXES:
            if model.startswith(prefix):
                return MODEL_PRICING[prefix]
    return MODEL_PRICING[_DEFAULT_MODEL]


def calculate_cost(
    model: str | None,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cache_read_tokens: int = 0,
    cache_creation_tokens: int = 0,
) -> float:
    """Calculate USD cost for a single agent run."""
    pricing = _resolve_pricing(model)
    return (
        input_tokens * pricing["input"]
        + output_tokens * pricing["output"]
        + cache_read_tokens * pricing.get("cache_read", 0)
        + cache_creation_tokens * pricing.get("cache_creation", 0)
    )
