from dashboard_api.cost import calculate_cost, MODEL_PRICING


def test_calculate_cost_opus():
    cost = calculate_cost(
        model="claude-opus-4-6",
        input_tokens=1000,
        output_tokens=500,
        cache_read_tokens=200,
        cache_creation_tokens=100,
    )
    pricing = MODEL_PRICING["claude-opus-4-6"]
    expected = (
        1000 * pricing["input"]
        + 500 * pricing["output"]
        + 200 * pricing["cache_read"]
        + 100 * pricing["cache_creation"]
    )
    assert abs(cost - expected) < 0.0001


def test_calculate_cost_sonnet():
    cost = calculate_cost(
        model="claude-sonnet-4-6",
        input_tokens=10000,
        output_tokens=2000,
    )
    pricing = MODEL_PRICING["claude-sonnet-4-6"]
    expected = 10000 * pricing["input"] + 2000 * pricing["output"]
    assert abs(cost - expected) < 0.0001


def test_calculate_cost_unknown_model_uses_sonnet_pricing():
    cost = calculate_cost(
        model="unknown-model",
        input_tokens=1000,
        output_tokens=500,
    )
    pricing = MODEL_PRICING["claude-sonnet-4-6"]
    expected = 1000 * pricing["input"] + 500 * pricing["output"]
    assert abs(cost - expected) < 0.0001


def test_calculate_cost_zero_tokens():
    cost = calculate_cost(model="claude-opus-4-6", input_tokens=0, output_tokens=0)
    assert cost == 0.0


def test_calculate_cost_partial_model_match():
    cost = calculate_cost(
        model="claude-opus-4-6-20250101",
        input_tokens=1000,
        output_tokens=500,
    )
    pricing = MODEL_PRICING["claude-opus-4-6"]
    expected = 1000 * pricing["input"] + 500 * pricing["output"]
    assert abs(cost - expected) < 0.0001
