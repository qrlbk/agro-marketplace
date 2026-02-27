# Utils package
from uuid import uuid4

from app.utils.sanitize import sanitize_text, sanitize_text_required


def generate_article_number() -> str:
    """Generate a unique-looking article number (e.g. ART-A1B2C3D4E5)."""
    return f"ART-{uuid4().hex[:10].upper()}"

__all__ = ["generate_article_number", "sanitize_text", "sanitize_text_required"]
