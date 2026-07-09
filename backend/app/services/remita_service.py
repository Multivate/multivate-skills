from __future__ import annotations

import hashlib
import json
import logging
import re
from typing import Any

import httpx

from app.core.config import get_settings

_logger = logging.getLogger(__name__)

REMITA_LIVE_BASE = "https://login.remita.net"
REMITA_PAYMENT_INIT_PATH = "/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit"
REMITA_FINALIZE_PATH = "/remita/exapp/api/v1/send/api/echannelsvc/finalize.reg"
REMITA_SUCCESS_STATUSES = {"00", "01"}


def remita_configured() -> bool:
    s = get_settings()
    return bool(s.remita_merchant_id.strip() and s.remita_api_key.strip() and s.remita_service_type_id.strip())


def sha512_hex(value: str) -> str:
    return hashlib.sha512(value.encode("utf-8")).hexdigest()


def amount_to_remita_string(amount_cents: int) -> str:
    if amount_cents <= 0:
        raise ValueError("amount must be positive")
    whole = amount_cents // 100
    remainder = amount_cents % 100
    if remainder == 0:
        return str(whole)
    return f"{whole}.{remainder:02d}"


def parse_remita_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("(") and text.endswith(")"):
        text = text[1:-1]
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("Remita response was not an object")
    return data


def _auth_headers(merchant_id: str, token: str) -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"remitaConsumerKey={merchant_id},remitaConsumerToken={token}",
    }


def generate_rrr_hash(*, merchant_id: str, service_type_id: str, order_id: str, amount: str, api_key: str) -> str:
    return sha512_hex(f"{merchant_id}{service_type_id}{order_id}{amount}{api_key}")


def payment_hash(*, merchant_id: str, rrr: str, api_key: str) -> str:
    return sha512_hex(f"{merchant_id}{rrr}{api_key}")


def status_hash(*, rrr: str, api_key: str, merchant_id: str) -> str:
    return sha512_hex(f"{rrr}{api_key}{merchant_id}")


def generate_rrr(
    *,
    order_id: str,
    amount_cents: int,
    payer_name: str,
    payer_email: str,
    payer_phone: str,
    description: str,
) -> dict[str, Any]:
    s = get_settings()
    merchant_id = s.remita_merchant_id.strip()
    api_key = s.remita_api_key.strip()
    service_type_id = s.remita_service_type_id.strip()
    amount = amount_to_remita_string(amount_cents)
    token = generate_rrr_hash(
        merchant_id=merchant_id,
        service_type_id=service_type_id,
        order_id=order_id,
        amount=amount,
        api_key=api_key,
    )
    payload = {
        "serviceTypeId": service_type_id,
        "amount": amount,
        "orderId": order_id,
        "payerName": payer_name[:120],
        "payerEmail": payer_email[:120],
        "payerPhone": payer_phone[:20],
        "description": description[:240],
    }
    url = f"{REMITA_LIVE_BASE}{REMITA_PAYMENT_INIT_PATH}"
    _logger.info(
        "Remita generate RRR order_id=%s amount=%s payer_email=%s",
        order_id,
        amount,
        payer_email,
    )
    with httpx.Client(timeout=45.0) as client:
        response = client.post(url, headers=_auth_headers(merchant_id, token), json=payload)
    raw = response.text
    _logger.info("Remita generate RRR response status=%s body=%s", response.status_code, raw[:500])
    if response.status_code >= 400:
        raise RuntimeError("Remita could not create a payment reference")
    data = parse_remita_json(raw)
    status_code = str(data.get("statuscode") or data.get("statusCode") or "")
    rrr = str(data.get("RRR") or data.get("rrr") or "").strip()
    if status_code != "025" or not rrr:
        raise RuntimeError(str(data.get("status") or data.get("message") or "Remita did not return a payment reference"))
    return data


def check_rrr_status(rrr: str) -> dict[str, Any]:
    s = get_settings()
    merchant_id = s.remita_merchant_id.strip()
    api_key = s.remita_api_key.strip()
    token = status_hash(rrr=rrr, api_key=api_key, merchant_id=merchant_id)
    path = f"/remita/exapp/api/v1/send/api/echannelsvc/{merchant_id}/{rrr}/{token}/status.reg"
    url = f"{REMITA_LIVE_BASE}{path}"
    _logger.info("Remita status check rrr=%s", rrr)
    with httpx.Client(timeout=45.0) as client:
        response = client.get(url, headers=_auth_headers(merchant_id, token))
    raw = response.text
    _logger.info("Remita status response status=%s body=%s", response.status_code, raw[:500])
    if response.status_code >= 400:
        raise RuntimeError("Remita status check failed")
    return parse_remita_json(raw)


def remita_status_is_paid(payload: dict[str, Any]) -> bool:
    code = str(payload.get("status") or payload.get("statuscode") or payload.get("statusCode") or "").strip()
    return code in REMITA_SUCCESS_STATUSES


def build_checkout(*, rrr: str, payment_reference: str) -> dict[str, str]:
    s = get_settings()
    merchant_id = s.remita_merchant_id.strip()
    api_key = s.remita_api_key.strip()
    response_url = f"{s.remita_return_url}?ref={payment_reference}"
    return {
        "rrr": rrr,
        "merchant_id": merchant_id,
        "payment_hash": payment_hash(merchant_id=merchant_id, rrr=rrr, api_key=api_key),
        "payment_gateway_url": f"{REMITA_LIVE_BASE}{REMITA_FINALIZE_PATH}",
        "response_url": response_url,
    }


def normalize_phone(value: str | None) -> str:
    digits = re.sub(r"\D", "", value or "")
    if digits.startswith("234") and len(digits) >= 13:
        return digits[:13]
    if digits.startswith("0") and len(digits) >= 11:
        return f"234{digits[1:11]}"
    if len(digits) >= 10:
        return f"234{digits[-10:]}"
    return "2348000000000"
