from __future__ import annotations

import html
from pathlib import Path
# Default copy for login/MFA challenges (mfa_service DB lifetime matches this unless overridden per call).
OTP_EXPIRY_MINUTES = 15

_BRAND_PRIMARY = "#4C3BCF"
_BRAND_INK = "#0B1220"
_BRAND_MUTED_BG = "#F4F5F8"
_BRAND_BOX_BG = "#F1F5F9"
_BRAND_BOX_BORDER = "#E2E8F0"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


_LOGO_FILE_NAMES = (
    "multivate-logo.png",
    "MULTIVATE MAIN LOGO.png",
    "MULTIVATE LOGO WHITE.png",
)
_LOGO_PUBLIC_PATH = "/MULTIVATE%20MAIN%20LOGO.png"


def resolve_brand_logo_path() -> Path | None:
    """PNG shipped with the API image, or frontend/public in a full checkout."""
    here = Path(__file__).resolve()
    search_dirs = (
        here.parents[1] / "assets" / "email",
        _repo_root() / "frontend" / "public",
        here.parents[2] / "frontend" / "public",
    )
    for folder in search_dirs:
        for name in _LOGO_FILE_NAMES:
            path = folder / name
            if path.is_file():
                return path
    return None


def public_brand_logo_url() -> str | None:
    """Absolute HTTPS URL for the logo on the live site (email clients load this)."""
    from app.core.config import get_settings

    custom = (get_settings().mail_logo_url or "").strip()
    if custom.startswith("https://"):
        return custom
    base = (get_settings().platform_public_url or "").strip().rstrip("/")
    if base.startswith("https://"):
        return f"{base}{_LOGO_PUBLIC_PATH}"
    return None


def _esc(s: str) -> str:
    return html.escape(s, quote=True)


def build_otp_email(
    *,
    recipient_first_name: str,
    code: str,
    subject: str,
    lead_in: str,
    code_context_line: str,
    support_href: str,
    footer_line: str,
    include_logo_cid: bool,
    expiry_minutes: int | None = None,
) -> tuple[str, str]:
    """Return (plain_text, html). Plain must contain the 6-digit code for dev fallback parsing."""
    minutes = OTP_EXPIRY_MINUTES if expiry_minutes is None else expiry_minutes
    name = recipient_first_name.strip() or "there"
    safe_name = _esc(name)
    safe_code = _esc(code)
    safe_lead = _esc(lead_in)
    safe_ctx = _esc(code_context_line)
    safe_footer = _esc(footer_line)

    plain = (
        f"Hi {name},\n\n"
        f"{lead_in}\n\n"
        f"{code_context_line}\n\n"
        f"  {code}\n\n"
        f"This code expires in {minutes} minutes.\n\n"
        f"Didn't request this code? Contact us: {support_href}\n\n"
        f"{footer_line}\n"
    )

    logo_src = public_brand_logo_url()
    if not logo_src and include_logo_cid and resolve_brand_logo_path() is not None:
        logo_src = "cid:multivate_logo"
    if logo_src:
        logo_block = (
            f'<img src="{_esc(logo_src)}" width="180" alt="Multivate" '
            'style="display:block;margin:0 auto 8px;max-width:220px;height:auto;border:0;" />'
        )
    else:
        logo_block = (
            f'<div style="font-size:26px;font-weight:800;color:{_BRAND_PRIMARY};letter-spacing:-0.03em;'
            f'font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">Multivate</div>'
        )

    html_doc = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{_esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:{_BRAND_MUTED_BG};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:{_BRAND_MUTED_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #E8ECF2;">
          <tr>
            <td style="padding:32px 36px 8px;text-align:center;">
              {logo_block}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:{_BRAND_INK};">
              <p style="margin:0 0 12px;">Hi {safe_name},</p>
              <p style="margin:0 0 20px;">{safe_lead}</p>
              <p style="margin:0 0 16px;">{safe_ctx}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:{_BRAND_BOX_BG};border:1px solid {_BRAND_BOX_BORDER};border-radius:10px;">
                <tr>
                  <td align="center" style="padding:22px 16px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.18em;color:{_BRAND_INK};">
                    {safe_code}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 20px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#64748B;">
              This code expires in {minutes} minutes.
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 28px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:{_BRAND_INK};">
              Didn't request this code? <a href="{_esc(support_href)}" style="color:{_BRAND_PRIMARY};font-weight:600;">Contact us.</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 36px 28px;border-top:1px solid #EEF2F7;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.45;color:#94A3B8;text-align:center;">
              {safe_footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return plain, html_doc


def send_password_reset_code(display_name: str, to_email: str, code: str) -> str | None:
    """Send reset code; returns dev plaintext when email could not be sent."""
    from app.core.config import get_settings
    from app.services import mail_service
    from email.utils import parseaddr

    settings = get_settings()
    subject = "Reset your Multivate password"
    lead_in = "Use this code to choose a new password for your account."
    code_context_line = "Your password reset code:"
    raw = (settings.mail_support_url or "").strip()
    if raw:
        support_href = raw
    else:
        _, addr = parseaddr(settings.mail_from)
        support_href = f"mailto:{addr}" if addr else "#"
    footer_line = (settings.mail_footer_line or "").strip() or "Delivered by Multivate."
    plain, html_body = build_otp_email(
        recipient_first_name=display_name,
        code=code,
        subject=subject,
        lead_in=lead_in,
        code_context_line=code_context_line,
        support_href=support_href,
        footer_line=footer_line,
        include_logo_cid=True,
        expiry_minutes=15,
    )
    return mail_service.send_plain_email(to_email, subject, plain, html_body)

