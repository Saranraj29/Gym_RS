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


def test_locations_crud_and_member_location(client):
    locs = client.get("/api/locations").json()
    assert [l["name"] for l in locs][:2] == ["Location 1", "Location 2"]
    new = client.post("/api/locations", json={"name": "Anna Nagar", "address": "1 Main Rd"}).json()
    assert client.post("/api/locations", json={"name": "Anna Nagar"}).status_code == 409
    m = new_member(client, name="Located Person", location_id=new["id"])
    assert m["location_name"] == "Anna Nagar"
    only = client.get("/api/members", params={"location_id": new["id"]}).json()
    assert only["total"] == 1
    assert client.delete(f"/api/locations/{new['id']}").status_code == 409  # has a member
    renamed = client.put(f"/api/locations/{new['id']}", json={"name": "Anna Nagar West"}).json()
    assert renamed["name"] == "Anna Nagar West"
    first = locs[0]["id"]
    moved = client.put(f"/api/members/{m['id']}", json={"name": "Located Person", "phone": "9876543210", "location_id": first}).json()
    assert moved["location_id"] == first
    assert moved["events"][0]["kind"] == "transferred"
    assert client.delete(f"/api/locations/{new['id']}").status_code == 204
    dash = client.get("/api/dashboard", params={"location_id": first}).json()
    assert len(dash["locations"]) >= 2


def test_inactive_and_reactivate_flow(client):
    m = new_member(client, name="Absconded Person", paid_amount=3300)
    r = client.post(f"/api/members/{m['id']}/inactive", json={"reason": "Not attending"})
    assert r.status_code == 200 and r.json()["status"] == "inactive"
    assert client.post(f"/api/members/{m['id']}/inactive", json={}).status_code == 409
    # inactive members are filtered out of active counts and can't be renewed the normal way
    inactive_list = client.get("/api/members", params={"status": "inactive"}).json()
    assert any(i["id"] == m["id"] for i in inactive_list["items"])
    assert all(i["id"] != m["id"] for i in client.get("/api/members", params={"status": "active"}).json()["items"])
    assert client.post(f"/api/members/{m['id']}/renew", json={"plan_id": plan_id(client)}).status_code == 409
    back = client.post(f"/api/members/{m['id']}/reactivate", json={"plan_id": plan_id(client, "Monthly"), "paid_amount": 1200, "mode": "Cash"})
    assert back.status_code == 201
    out = back.json()
    assert out["status"] == "active" and out["plan_name"] == "Monthly"
    kinds = [e["kind"] for e in out["events"]]
    assert kinds[:2] == ["reactivated", "inactive"] or kinds[0] == "reactivated"
    assert client.post(f"/api/members/{m['id']}/reactivate", json={"plan_id": plan_id(client)}).status_code == 409


def test_bulk_inactive_and_lapsed(client):
    from datetime import timedelta
    m = new_member(client, name="Lapsed Person", paid_amount=3300, join_date=(svc.today() - timedelta(days=200)).isoformat())
    assert m["status"] == "expired"
    lapsed = client.get("/api/members", params={"status": "lapsed"}).json()
    assert any(i["id"] == m["id"] for i in lapsed["items"])
    res = client.post("/api/members/bulk-inactive", json={"member_ids": [i["id"] for i in lapsed["items"]], "reason": "Not attending"}).json()
    assert res["updated"] >= 1
    assert client.get("/api/members", params={"status": "lapsed"}).json()["total"] == 0
