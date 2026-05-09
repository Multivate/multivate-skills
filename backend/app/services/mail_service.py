"""Outbound transactional email via Resend HTTPS API only; dev logs OTP when no API key."""

from __future__ import annotations

import base64
import json
import logging
import re
import urllib.error
import urllib.request
from pathlib import Path

from app.core.config import get_settings
from app.services.otp_email import resolve_brand_logo_path

_logger = logging.getLogger(__name__)


def _otp_from_plain_body(body: str) -> str | None:
    m = re.search(r"\b(\d{6})\b", body)
    return m.group(1) if m else None


def _resend_from_header() -> str:
    s = get_settings()
    rf = (s.resend_from or "").strip()
    if rf:
        return rf
    mf = (s.mail_from or "").strip()
    if mf:
        return mf
    raise ValueError("Set RESEND_FROM (or MAIL_FROM) to a Resend-verified sender address.")


def _send_via_resend(to_address: str, subject: str, body: str, html_body: str | None) -> None:
    s = get_settings()
    key = (s.resend_api_key or "").strip()
    from_hdr = _resend_from_header()
    payload: dict[str, object] = {
        "from": from_hdr,
        "to": [to_address],
        "subject": subject,
        "text": body,
    }
    if html_body:
        payload["html"] = html_body
        logo_path = resolve_brand_logo_path()
        if logo_path is not None and "cid:multivate_logo" in html_body:
            try:
                raw = Path(logo_path).read_bytes()
                payload["attachments"] = [
                    {
                        "content": base64.b64encode(raw).decode("ascii"),
                        "filename": "multivate-logo.png",
                        "content_type": "image/png",
                        "content_id": "multivate_logo",
                    }
                ]
            except OSError as exc:
                _logger.warning("Brand logo inline attach skipped %s: %s", logo_path, exc)

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=data,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        _logger.error("Resend HTTP %s: %s", e.code, err_body)
        raise ValueError(f"Resend error {e.code}: {err_body[:400]}") from e


def send_plain_email(to_address: str, subject: str, body: str, html_body: str | None = None) -> str | None:
    """Send via Resend when RESEND_API_KEY is set; else log OTP for local dev (returns 6-digit code)."""
    settings = get_settings()
    resend_key = (settings.resend_api_key or "").strip()

    if not resend_key:
        code = _otp_from_plain_body(body)
        if code:
            _logger.info("MULTIVATE_DEV_OTP to=%s code=%s (RESEND_API_KEY unset; email not sent).", to_address, code)
        _logger.warning("No RESEND_API_KEY; not sending. Recipient=%s subject=%r", to_address, subject)
        _logger.debug("Dev plain body:\n%s", body)
        return code

    try:
        _send_via_resend(to_address, subject, body, html_body)
    except Exception as exc:
        if get_settings().environment == "development":
            code = _otp_from_plain_body(body)
            _logger.warning(
                "DEV: outbound email failed (%s); OTP from body only (email not sent). %s",
                type(exc).__name__,
                exc,
            )
            if code:
                _logger.info("MULTIVATE_DEV_OTP to=%s code=%s", to_address, code)
            return code
        raise

    _logger.info("Email sent ok to=%s subject=%r", to_address, subject)
    return None
