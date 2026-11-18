from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_list_claims():
    claims = client.get("/api/claims").json()
    assert len(claims) == 25
    assert {claim["stage"] for claim in claims} == {"waiting"}
    assert claims[0]["claim_id"] == "CLM-1001"
    assert claims[0]["customer_name"] == "Maya Patel"
    assert claims[0]["outcome"] is None


def test_get_claim():
    claim = client.get("/api/claims/CLM-1001").json()
    assert claim["amount_claimed"] == 420
    assert claim["claim_type"] == "trip_delay"
    assert len(claim["items"]) == 3
    assert len(claim["documents"]) == 4
    assert claim["documents"][0]["type"] == "carrier_report"
    assert claim["payout"] is None


def test_get_claim_that_is_not_there():
    response = client.get("/api/claims/CLM-9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "No claim CLM-9999"


def test_get_policy():
    policy = client.get("/api/policies/POL-2001").json()
    assert policy["plan"] == "premium"
    assert policy["plan_name"] == "UnderCover Premium"
    assert policy["plan_limits"]["per_item_limit"] == 300
    assert policy["plan_limits"]["deductible"] == 50
    assert policy["deductible_applies_to"] == ["baggage", "emergency_medical"]
    assert policy["trip"]["destination"] == "Rome, Italy"
    assert policy["travelers"] == ["Maya Patel"]
    assert policy["add_ons"] == []


def test_get_policy_with_an_add_on():
    policy = client.get("/api/policies/POL-2009").json()
    add_on = policy["add_ons"][0]
    assert add_on["name"] == "Electronics Plus"
    assert add_on["electronics_per_item_limit"] == 1200


def test_get_policy_that_is_not_there():
    assert client.get("/api/policies/POL-9999").status_code == 404


def test_get_customer():
    customer = client.get("/api/customers/CUS-3001").json()
    assert customer["name"] == "Maya Patel"
    assert customer["address"]["city"] == "Jersey City"
    assert len(customer["previous_claims"]) == 1
    assert customer["previous_claims"][0]["claim_id"] == "CLM-0412"


def test_get_customer_that_is_not_there():
    assert client.get("/api/customers/CUS-9999").status_code == 404


def test_get_policy_wording():
    text = client.get("/api/policy-wording").json()["text"]
    assert text.splitlines()[0] == "# UnderCover Travel Insurance: Policy Wording"
    assert "Per-item limit" in text


def test_list_handlers():
    handlers = client.get("/api/handlers").json()
    assert len(handlers) == 3
    assert handlers[0]["name"] == "Dana Whitfield"
    assert handlers[0]["can_approve_over_limit"] is True
