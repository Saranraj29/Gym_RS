from datetime import timedelta

import pytest

from app import services as svc
from app import whatsapp
from app.templates import TEMPLATES


@pytest.fixture
def api_env(monkeypatch):
    monkeypatch.setenv("WHATSAPP_ACCESS_TOKEN", "test-token")
    monkeypatch.setenv("WHATSAPP_PHONE_NUMBER_ID", "12345")
    calls = []

    def fake_post(url, token, payload):
        calls.append((url, token, payload))
        return 200, {"messages": [{"id": "wamid.TEST"}]}

    monkeypatch.setattr(whatsapp, "_post", fake_post)
    return calls


def mk(client, name, **extra):
    plans = client.get("/api/plans").json()
    pid = next(p["id"] for p in plans if p["name"] == "Monthly")
    body = {"name": name, "phone": "98765 43210", "plan_id": pid, "paid_amount": 0, "payment_mode": "Cash"}
    body.update(extra)
    return client.post("/api/members", json=body).json()


def test_guide_matches_params():
    g = {(t["kind"], t["language"]): t for t in whatsapp.guide(TEMPLATES)}
    renewal = g[("renewal", "en")]
    assert renewal["name"] == "fittrack_renewal_en"
    assert renewal["params"] == ["name", "plan", "gym", "date"]
    assert "{{1}}" in renewal["body"] and "{{4}}" in renewal["body"] and "{name}" not in renewal["body"]


def test_send_requires_configuration(client, monkeypatch):
    monkeypatch.delenv("WHATSAPP_ACCESS_TOKEN", raising=False)
    monkeypatch.delenv("WHATSAPP_PHONE_NUMBER_ID", raising=False)
    monkeypatch.delenv("WHATSAPP_DRY_RUN", raising=False)
    assert client.get("/api/settings").json()["whatsapp_api_available"] is False
    assert client.post("/api/reminders/send", json={"member_ids": [1], "kind": "fee"}).status_code == 409
    assert client.put("/api/settings", json={"reminder_method": "api"}).status_code == 422


def test_send_builds_template_payload_and_logs(client, api_env):
    m = mk(client, "Template Tester")
    assert client.put("/api/settings", json={"reminder_method": "api"}).json()["reminder_method"] == "api"
    res = client.post("/api/reminders/send", json={"member_ids": [m["id"]], "kind": "fee", "lang": "en"}).json()
    assert res["sent"] == 1 and res["failed"] == 0
    url, token, payload = api_env[-1]
    assert url == "https://graph.facebook.com/v23.0/12345/messages" and token == "test-token"
    assert payload["to"] == "919876543210"
    assert payload["template"]["name"] == "fittrack_fee_en"
    texts = [p["text"] for p in payload["template"]["components"][0]["parameters"]]
    assert texts[0] == "Template Tester" and "1,200" in texts
    hist = client.get(f"/api/members/{m['id']}").json()["reminders"]
    assert hist[0]["kind"] == "fee" and hist[0]["channel"] == "whatsapp_api"


def test_send_reports_meta_errors(client, monkeypatch):
    monkeypatch.setenv("WHATSAPP_ACCESS_TOKEN", "t")
    monkeypatch.setenv("WHATSAPP_PHONE_NUMBER_ID", "1")
    monkeypatch.setattr(whatsapp, "_post", lambda *a: (400, {"error": {"message": "Template name does not exist"}}))
    m = mk(client, "Error Tester")
    res = client.post("/api/reminders/send", json={"member_ids": [m["id"]], "kind": "fee"}).json()
    assert res["failed"] == 1 and "Template name does not exist" in res["results"][0]["error"]
    assert client.get(f"/api/members/{m['id']}").json()["reminders"] == []  # failures are not logged as sent


def test_auto_rules_send_once(client, api_env):
    client.put("/api/settings", json={"reminder_method": "api", "rule_before_expiry": True, "rule_on_expiry": True, "rule_fee_balance": False})
    start = svc.today() - timedelta(days=25)  # monthly plan ending in ~4 days
    m = mk(client, "Auto Due", join_date=start.isoformat(), paid_amount=1200)
    assert m["status"] == "due"
    first = client.post("/api/reminders/auto-run").json()
    assert first["sent"] >= 1 and first["failed"] == 0
    names = [c[2]["template"]["name"] for c in api_env]
    assert "fittrack_renewal_en" in names
    second = client.post("/api/reminders/auto-run").json()
    assert second["sent"] == 0  # already messaged — no duplicates


def test_dry_run_never_calls_meta(client, monkeypatch):
    monkeypatch.setenv("WHATSAPP_DRY_RUN", "true")
    monkeypatch.setattr(whatsapp, "_post", lambda *a: pytest.fail("must not call Meta in dry-run"))
    m = mk(client, "Dry Runner")
    res = client.post("/api/reminders/send", json={"member_ids": [m["id"]], "kind": "welcome"}).json()
    assert res["sent"] == 1


def test_no_template_starts_or_ends_with_a_placeholder():
    import re

    for item in whatsapp.guide(TEMPLATES):
        body = item["body"].strip()
        assert not re.match(r"^\{\{\d+\}\}", body), item["name"]
        assert not re.search(r"\{\{\d+\}\}[.!?]?$", body), item["name"]
