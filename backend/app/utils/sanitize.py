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
