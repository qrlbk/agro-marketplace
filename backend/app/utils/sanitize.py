"""Input sanitization for user-controlled strings before persisting to DB.

- Strip leading/trailing whitespace.
- Remove control characters (C0, C1, DEL) to avoid injection and broken storage.
- Optional max length truncation.

Does NOT do HTML escaping (assume frontend or template engine escapes on output for XSS).
"""

import re
import unicodedata

# Control chars: C0 (0x00-0x1F except tab/newline/cr), DEL (0x7F), C1 (0x80-0x9F)
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\x80-\x9f]+")


def sanitize_text(value: str | None, max_length: int = 0) -> str | None:
    """Normalize and sanitize a string for safe storage.

    - None -> None
    - Strip whitespace; empty -> None
    - NFC normalization
    - Remove control characters
    - If max_length > 0, truncate (by codepoints, not bytes)
    """
    if value is None:
        return None
    s = (value or "").strip()
    if not s:
        return None
    s = unicodedata.normalize("NFC", s)
    s = _CONTROL_RE.sub("", s)
    if max_length > 0 and len(s) > max_length:
        s = s[:max_length]
    return s if s else None


def sanitize_text_required(value: str | None, max_length: int = 0) -> str:
    """Like sanitize_text but returns empty string instead of None for empty input."""
    out = sanitize_text(value, max_length)
    return out if out is not None else ""


_DANGEROUS_SCHEMES = {"javascript:", "data:text/html", "vbscript:"}


def validate_image_url(url: str) -> bool:
    """Return True if *url* is safe to store as a product image URL.

    Allowed:
      - Relative paths starting with /uploads/
      - HTTPS URLs to external images
    Blocked:
      - javascript:, data:text/html, vbscript: schemes
      - Non-HTTPS external URLs (except localhost for dev)
    """
    stripped = url.strip()
    lower = stripped.lower()
    for scheme in _DANGEROUS_SCHEMES:
        if lower.startswith(scheme):
            return False
    if stripped.startswith("/"):
        return stripped.startswith("/uploads/")
    if lower.startswith("https://"):
        return True
    if lower.startswith("http://localhost") or lower.startswith("http://127.0.0.1"):
        return True
    return False


def sanitize_image_urls(urls: list[str] | None) -> list[str] | None:
    """Filter a list of image URLs, keeping only safe ones."""
    if urls is None:
        return None
    return [u for u in urls if validate_image_url(u)]
