from datetime import timedelta
from io import BytesIO

from PIL import Image

from app import services as svc


def plan_id(client, name="Quarterly"):
    return next(p["id"] for p in client.get("/api/plans").json() if p["name"] == name)


def new_member(client, **extra):
    body = {"name": "Test Member", "phone": "98765 43210", "plan_id": plan_id(client), "paid_amount": 1800, "payment_mode": "UPI"}
    body.update(extra)
    r = client.post("/api/members", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_default_plans_seeded(client):
    names = [p["name"] for p in client.get("/api/plans").json()]
    assert names == ["Monthly", "Quarterly", "Half-yearly", "Yearly"]


def test_create_member_computes_dates_and_balance(client):
    m = new_member(client)
    today = svc.today()
    assert m["status"] == "active"
    assert m["start_date"] == today.isoformat()
    assert m["end_date"] == (today + timedelta(days=89)).isoformat()
    assert (m["fee_total"], m["paid"], m["balance"]) == (3300, 1800, 1500)
    assert m["phone"] == "9876543210"
    assert m["payments"][0]["receipt"].startswith("#R-")


def test_collect_payment_and_overpay_rejected(client):
    m = new_member(client, name="Pay Person")
    too_much = client.post(f"/api/members/{m['id']}/payments", json={"amount": 5000, "mode": "Cash"})
    assert too_much.status_code == 422
    ok = client.post(f"/api/members/{m['id']}/payments", json={"amount": 1500, "mode": "Cash"})
    assert ok.status_code == 201
    assert ok.json()["member"]["balance"] == 0
    again = client.post(f"/api/members/{m['id']}/payments", json={"amount": 10, "mode": "Cash"})
    assert again.status_code == 409


def test_renew_continues_after_current_period(client):
    m = new_member(client, name="Renew Person", paid_amount=3300)
    r = client.post(f"/api/members/{m['id']}/renew", json={"plan_id": plan_id(client, "Monthly"), "paid_amount": 1200, "mode": "Cash"})
    assert r.status_code == 201
    out = r.json()
    assert out["plan_name"] == "Monthly"
    assert out["start_date"] == (svc.today() + timedelta(days=90)).isoformat()
    assert out["balance"] == 0


def test_list_filters_and_search(client):
    new_member(client, name="Searchable Zed", phone="9111111111")
    res = client.get("/api/members", params={"q": "searchable"}).json()
    assert res["total"] == 1
    by_phone = client.get("/api/members", params={"q": "9111111111"}).json()
    assert by_phone["total"] == 1
    # a query that merely contains a digit must not behave like a phone search
    assert client.get("/api/members", params={"q": "Zed2"}).json()["total"] == 0
    pending = client.get("/api/members", params={"status": "pending"}).json()
    assert all(i["balance"] > 0 for i in pending["items"])
    assert pending["counts"]["all"] >= 3


def test_photo_upload_resizes_and_can_be_removed(client):
    m = new_member(client, name="Photo Person")
    buf = BytesIO()
    Image.new("RGB", (900, 500), (200, 40, 40)).save(buf, "PNG")
    r = client.post(f"/api/members/{m['id']}/photo", files={"file": ("p.png", buf.getvalue(), "image/png")})
    assert r.status_code == 200
    url = r.json()["photo_url"]
    img = Image.open(BytesIO(client.get(url).content))
    assert img.size == (640, 640)
    assert client.delete(f"/api/members/{m['id']}/photo").status_code == 204
    assert client.get(f"/api/members/{m['id']}").json()["photo_url"] is None


def test_photo_rejects_non_images(client):
    m = new_member(client, name="Bad Photo")
    r = client.post(f"/api/members/{m['id']}/photo", files={"file": ("x.png", b"not an image", "image/png")})
    assert r.status_code == 422


def test_dashboard_and_fees(client):
    dash = client.get("/api/dashboard").json()
    assert dash["stats"]["active_members"] >= 1
    assert len(dash["revenue"]) == 6
    fees = client.get("/api/fees").json()
    assert fees["summary"]["total_pending"] == sum(i["balance"] for i in fees["items"])


def test_plan_in_use_is_archived_not_deleted(client):
    p = client.post("/api/plans", json={"name": "Weekend", "price": 500, "duration_days": 14}).json()
    assert client.post("/api/plans", json={"name": "Weekend", "price": 1, "duration_days": 1}).status_code == 409
    new_member(client, name="Weekend Warrior", plan_id=p["id"], paid_amount=500)
    assert client.delete(f"/api/plans/{p['id']}").status_code == 204
    assert "Weekend" not in [x["name"] for x in client.get("/api/plans").json()]


def test_settings_and_reminder_log(client):
    s = client.put("/api/settings", json={"gym_name": "Iron Temple", "rule_fee_balance": True}).json()
    assert s["gym_name"] == "Iron Temple" and s["rule_fee_balance"] is True
    aud = client.get("/api/reminders/audience", params={"kind": "fee"}).json()
    assert aud["gym_name"] == "Iron Temple" and aud["members"]
    ids = [m["id"] for m in aud["members"]][:2]
    assert client.post("/api/reminders/log", json={"member_ids": ids, "kind": "fee"}).json()["logged"] == len(ids)
    assert client.get("/api/reminders/history").json()[0]["sent"] == len(ids)


def test_validation_errors(client):
    r = client.post("/api/members", json={"name": "A", "phone": "12", "plan_id": 1})
    assert r.status_code == 422
    assert client.get("/api/members/999999").status_code == 404
