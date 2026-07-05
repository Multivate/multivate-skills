from __future__ import annotations

import base64
import json
import logging
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

from app.core.config import get_settings
from app.services.otp_email import resolve_brand_logo_path

_logger = logging.getLogger(__name__)


class EmailDeliveryError(ValueError):
    """Recipient could not receive mail (e.g. Resend sandbox limits before domain verification)."""

    def __init__(self, message: str, *, recipient: str) -> None:
        self.recipient = recipient
        super().__init__(message)


def _user_friendly_resend_error(err_body: str, recipient: str) -> EmailDeliveryError | None:
    try:
        parsed = json.loads(err_body)
    except json.JSONDecodeError:
        return None
    if parsed.get("name") != "validation_error":
        return None
    api_msg = str(parsed.get("message", ""))
    lower = api_msg.lower()
    if "only send testing emails" not in lower and "verify a domain" not in lower:
        return None

    allowed = None
    m = re.search(r"\(([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\)", api_msg)
    if m:
        allowed = m.group(1)
    if allowed:
        message = (
            f"We couldn't send a code to {recipient} yet. "
            f"While email delivery is being set up, codes can only be sent to {allowed}."
        )
    else:
        message = (
            "We couldn't send a verification code to this email address yet. "
            "Please try again with the email linked to your account."
        )
    return EmailDeliveryError(message, recipient=recipient)


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
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            # Resend sits behind Cloudflare; urllib's default User-Agent is blocked (403 / error 1010).
            "User-Agent": "Multivate/1.0 (transactional-mail; +https://multivate.com.ng)",
        },
        method="POST",
    )
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp.read()
            if attempt > 1:
                _logger.info("Resend send succeeded on attempt %s to=%s", attempt, to_address)
            return
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            _logger.error("Resend HTTP %s to=%s: %s", e.code, to_address, err_body)
            delivery_err = _user_friendly_resend_error(err_body, to_address)
            if delivery_err is not None:
                raise delivery_err from e
            raise ValueError(f"Resend error {e.code}: {err_body[:400]}") from e
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            if attempt >= max_attempts:
                _logger.error(
                    "Resend send failed after %s attempts to=%s: %s",
                    max_attempts,
                    to_address,
                    exc,
                )
                raise
            wait_s = 0.75 * attempt
            _logger.warning(
                "Resend send attempt %s/%s failed to=%s (%s); retrying in %.1fs",
                attempt,
                max_attempts,
                to_address,
                type(exc).__name__,
                wait_s,
            )
            time.sleep(wait_s)


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
    except EmailDeliveryError:
        raise
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


def expose_dev_otp_if_allowed(plaintext_code: str | None) -> str | None:
    """Return OTP for local dev only when Resend is not configured."""
    code = (plaintext_code or "").strip()
    if len(code) != 6 or not code.isdigit():
        return None
    settings = get_settings()
    if (settings.resend_api_key or "").strip():
        return None
    if settings.environment != "development":
        return None
    return code
