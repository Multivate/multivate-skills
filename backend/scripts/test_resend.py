"""Send one test message using the same Resend settings as the API.

  python scripts/test_resend.py recipient@example.com
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_resend.py recipient@example.com", file=sys.stderr)
        sys.exit(2)
    to = sys.argv[1].strip()
    from app.core.config import get_settings
    from app.services.mail_service import send_plain_email

    get_settings.cache_clear()
    s = get_settings()
    if not (s.resend_api_key or "").strip():
        print("Set RESEND_API_KEY (and RESEND_FROM) in backend/.env first.", file=sys.stderr)
        sys.exit(1)
    send_plain_email(
        to,
        "Multivate email test",
        "If you received this, outbound email is configured.\n",
        "<p>If you received this, outbound email is configured.</p>",
    )
    print("OK: message accepted for", to)


if __name__ == "__main__":
    main()
