from fastapi.testclient import TestClient

from backend import db
from backend.main import app

client = TestClient(app)

REASON = "The carrier canceled the flight, so the extra night is covered."
SECTION = "Section 3: Trip Delay"


def start(claim_id: str, thread_id: str = "thread-1"):
    return client.post(f"/api/claims/{claim_id}/start", json={"thread_id": thread_id})


def decide(claim_id: str, outcome: str, payout: float):
    return client.post(
        f"/api/claims/{claim_id}/decision",
        json={
            "outcome": outcome,
            "payout": payout,
            "reason": REASON,
            "policy_section": SECTION,
        },
    )


def pay(claim_id: str, amount: float):
    return client.post(f"/api/claims/{claim_id}/payment", json={"amount": amount})


def sign_off(claim_id: str, handler_id: str = "HND-01"):
    return client.post(
        f"/api/claims/{claim_id}/sign-off", json={"handler_id": handler_id}
    )


def stop(claim_id: str):
    return client.post(f"/api/claims/{claim_id}/stop")


def approve(claim_id: str, payout: float):
    start(claim_id)
    return decide(claim_id, "approve", payout)


def test_start_puts_the_claim_in_progress():
    claim = start("CLM-1001").json()
    assert claim["stage"] == "in_progress"
    assert claim["thread_id"] == "thread-1"


def test_start_twice_is_refused():
    start("CLM-1001")
    response = start("CLM-1001")
    assert response.status_code == 409
    assert response.json()["detail"] == "CLM-1001 is already in progress"


def test_start_clears_an_earlier_run():
    approve("CLM-1001", 420)
    client.post("/api/claims/CLM-1001/steps", json={"step": "Read the claim"})
    start("CLM-1001", "thread-2")
    claim = client.get("/api/claims/CLM-1001").json()
    assert claim["outcome"] is None
    assert claim["payout"] is None
    assert client.get("/api/claims/CLM-1001/steps").json() == []


def test_steps_come_back_in_order():
    start("CLM-1001")
    client.post("/api/claims/CLM-1001/steps", json={"step": "Read the claim"})
    client.post("/api/claims/CLM-1001/steps", json={"step": "Read the policy"})
    steps = client.get("/api/claims/CLM-1001/steps").json()
    assert [step["step"] for step in steps] == ["Read the claim", "Read the policy"]
    assert steps[0]["thread_id"] == "thread-1"
    assert steps[0]["at"] < steps[1]["at"] or steps[0]["at"] == steps[1]["at"]


def test_a_step_needs_a_claim_in_progress():
    response = client.post("/api/claims/CLM-1001/steps", json={"step": "Read it"})
    assert response.status_code == 409
    assert response.json()["detail"] == "CLM-1001 is not in progress"


def test_an_approval_under_the_limit_is_decided():
    claim = approve("CLM-1001", 420).json()
    assert claim["stage"] == "decided"
    assert claim["payout"] == 420
    assert claim["reason"] == REASON
    assert claim["policy_section"] == SECTION
    assert claim["decided_at"]


def test_paying_an_approved_claim():
    approve("CLM-1001", 420)
    claim = pay("CLM-1001", 420).json()
    assert claim["paid_amount"] == 420
    assert claim["paid_at"]
    assert pay("CLM-1001", 420).status_code == 409


def test_the_payment_must_be_the_payout():
    approve("CLM-1002", 900)
    response = pay("CLM-1002", 9000)
    assert response.status_code == 409
    assert response.json()["detail"] == "The payment must be $900.00"
    assert client.get("/api/claims/CLM-1002").json()["paid_amount"] is None


def test_an_approval_over_the_limit_waits_for_sign_off():
    claim = approve("CLM-1003", 3750).json()
    assert claim["stage"] == "awaiting_signoff"
    response = pay("CLM-1003", 3750)
    assert response.status_code == 409
    assert response.json()["detail"] == "CLM-1003 waits for a handler's sign-off"


def test_sign_off_lets_the_payment_through():
    approve("CLM-1003", 3750)
    claim = sign_off("CLM-1003").json()
    assert claim["stage"] == "decided"
    assert claim["signed_off_by"] == "HND-01"
    assert claim["signed_off_at"]
    assert pay("CLM-1003", 3750).json()["paid_amount"] == 3750


def test_the_limit_itself_needs_no_sign_off():
    assert approve("CLM-1002", 1000).json()["stage"] == "decided"
    assert pay("CLM-1002", 1000).json()["paid_amount"] == 1000


def test_a_cent_over_the_limit_needs_sign_off():
    assert approve("CLM-1002", 1000.01).json()["stage"] == "awaiting_signoff"
    assert pay("CLM-1002", 1000.01).status_code == 409


def test_a_decline_cannot_carry_a_payout():
    start("CLM-1001")
    assert decide("CLM-1001", "decline", 100).status_code == 422
    assert decide("CLM-1001", "refer", 100).status_code == 422
    assert decide("CLM-1001", "approve", -1).status_code == 422


def test_a_declined_claim_is_not_paid():
    start("CLM-1001")
    claim = decide("CLM-1001", "decline", 0).json()
    assert claim["stage"] == "decided"
    response = pay("CLM-1001", 0)
    assert response.status_code == 409
    assert response.json()["detail"] == "CLM-1001 has not been approved"


def test_a_referred_claim_is_decided_without_a_payout():
    start("CLM-1004")
    claim = decide("CLM-1004", "refer", 0).json()
    assert claim["stage"] == "decided"
    assert claim["outcome"] == "refer"


def test_a_decision_needs_a_claim_in_progress():
    assert decide("CLM-1001", "approve", 100).status_code == 409


def test_stop_returns_the_claim_to_the_queue():
    start("CLM-1001")
    assert stop("CLM-1001").json()["stage"] == "waiting"
    assert stop("CLM-1001").status_code == 409


def test_sign_off_needs_a_claim_that_is_waiting_for_it():
    approve("CLM-1001", 420)
    response = sign_off("CLM-1001")
    assert response.status_code == 409
    assert response.json()["detail"] == "CLM-1001 is not waiting for sign-off"


def test_sign_off_needs_a_handler():
    approve("CLM-1003", 3750)
    assert sign_off("CLM-1003", "HND-99").status_code == 404


def test_a_handler_without_the_right_cannot_sign_off():
    approve("CLM-1003", 3750)
    with db.connection() as conn:
        conn.execute(
            "UPDATE handlers SET can_approve_over_limit = 0 WHERE handler_id = 'HND-03'"
        )
    response = sign_off("CLM-1003", "HND-03")
    assert response.status_code == 409
    assert "cannot sign off" in response.json()["detail"]


def test_the_workflow_needs_a_claim_that_exists():
    assert start("CLM-9999").status_code == 404
    assert client.get("/api/claims/CLM-9999/steps").status_code == 404
    assert pay("CLM-9999", 10).status_code == 404


def test_a_paid_claim_cannot_be_run_again():
    approve("CLM-1001", 420)
    pay("CLM-1001", 420)
    response = start("CLM-1001")
    assert response.status_code == 409
    assert response.json()["detail"] == "CLM-1001 has been paid"


def test_a_signed_off_claim_cannot_be_run_again():
    approve("CLM-1003", 3750)
    sign_off("CLM-1003")
    response = start("CLM-1003")
    assert response.status_code == 409
    assert response.json()["detail"] == "CLM-1003 has been signed off"
