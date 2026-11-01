"""WhatsApp Business Cloud API (Meta) client.

Business-initiated WhatsApp messages must use pre-approved *templates*. Each reminder kind/language maps to a
template named ``fittrack_<kind>_<lang>`` whose body uses numbered placeholders in the order the variables first
appear in our default text (see ``guide()``), so what we send always matches what you create in Meta.

Credentials come from the environment only (never stored in the database):
  WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_VERSION, WHATSAPP_DRY_RUN
"""
import logging
import os
import re
from dataclasses import dataclass

import httpx

log = logging.getLogger("fittrack.whatsapp")

VAR_RE = re.compile(r"\{(name|plan|date|amount|gym)\}")
CATEGORY = {"renewal": "UTILITY", "fee": "UTILITY", "receipt": "UTILITY", "welcome": "UTILITY", "expired": "MARKETING"}


@dataclass
class SendResult:
    ok: bool
    error: str | None = None
    message_id: str | None = None


def dry_run() -> bool:
    return os.getenv("WHATSAPP_DRY_RUN", "false").lower() == "true"


def credentials() -> tuple[str, str, str]:
    return (
        os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip(),
        os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip(),
        os.getenv("WHATSAPP_API_VERSION", "v23.0").strip(),
    )


def available() -> bool:
    token, phone_id, _ = credentials()
    return dry_run() or bool(token and phone_id)


def template_name(kind: str, lang: str) -> str:
    return f"fittrack_{kind}_{lang}"


def param_order(text: str) -> list[str]:
    """Variables in order of first appearance — this is the {{1}}, {{2}}… numbering."""
    seen: list[str] = []
    for var in VAR_RE.findall(text):
        if var not in seen:
            seen.append(var)
    return seen


def meta_body(text: str) -> str:
    order = param_order(text)
    return VAR_RE.sub(lambda m: "{{" + str(order.index(m.group(1)) + 1) + "}}", text)


def guide(templates: dict) -> list[dict]:
    out = []
    for lang, kinds in templates.items():
        for kind, text in kinds.items():
            out.append(
                {
                    "kind": kind,
                    "language": lang,
                    "name": template_name(kind, lang),
                    "category": CATEGORY.get(kind, "UTILITY"),
                    "body": meta_body(text),
                    "params": param_order(text),
                }
            )
    return out


def _post(url: str, token: str, payload: dict) -> tuple[int, dict]:
    with httpx.Client(timeout=15) as client:
        res = client.post(url, json=payload, headers={"Authorization": f"Bearer {token}"})
    try:
        return res.status_code, res.json()
    except ValueError:
        return res.status_code, {}


def send_template(to: str, kind: str, lang: str, text: str, values: dict) -> SendResult:
    """Send one approved template. ``text`` is our default wording (defines placeholder order)."""
    params = [str(values.get(v, "")).replace("\n", " ").strip() or "-" for v in param_order(text)]
    name = template_name(kind, lang)
    if dry_run():
        log.info("[dry-run] would send %s (%s) to %s with %s", name, lang, to, params)
        return SendResult(True, message_id="dry-run")

    token, phone_id, version = credentials()
    if not (token and phone_id):
        return SendResult(False, "WhatsApp API credentials are not configured")
    template: dict = {"name": name, "language": {"code": lang}}
    if params:
        template["components"] = [{"type": "body", "parameters": [{"type": "text", "text": p} for p in params]}]
    payload = {"messaging_product": "whatsapp", "to": to, "type": "template", "template": template}
    try:
        status, body = _post(f"https://graph.facebook.com/{version}/{phone_id}/messages", token, payload)
    except httpx.HTTPError as exc:
        log.warning("WhatsApp request failed: %s", exc)
        return SendResult(False, "Could not reach WhatsApp (network error)")
    if status == 200 and body.get("messages"):
        return SendResult(True, message_id=body["messages"][0].get("id"))
    err = body.get("error", {})
    message = err.get("error_data", {}).get("details") or err.get("message") or f"WhatsApp returned HTTP {status}"
    log.warning("WhatsApp send failed (%s): %s", status, message)
    return SendResult(False, message)
