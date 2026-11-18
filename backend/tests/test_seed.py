from backend import db, seed, store


def test_build_counts():
    assert seed.build() == {
        "claims": 25,
        "policies": 50,
        "customers": 49,
        "plans": 3,
        "handlers": 3,
    }


def test_every_claim_starts_waiting():
    with db.connection() as conn:
        stages = conn.execute("SELECT DISTINCT stage FROM claims").fetchall()
    assert [row["stage"] for row in stages] == ["waiting"]


def test_company_settings():
    assert store.approval_limit() == 1000.0
    assert store.setting("company")["currency"] == "USD"


def test_build_replaces_what_is_there():
    with db.connection() as conn:
        conn.execute("DELETE FROM claims WHERE claim_id = 'CLM-1001'")
    seed.build()
    assert store.get_claim("CLM-1001") is not None
