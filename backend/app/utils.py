from uuid import uuid4


def generate_article_number() -> str:
    """Generate a unique-looking article number (e.g. ART-A1B2C3D4E5)."""
    return f"ART-{uuid4().hex[:10].upper()}"
