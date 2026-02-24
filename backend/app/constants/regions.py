"""Regions of Kazakhstan — single source of truth for validation and API."""

REGIONS_KZ = [
    "Акмолинская область",
    "Актюбинская область",
    "Алматинская область",
    "Атырауская область",
    "Восточно-Казахстанская область",
    "Жамбылская область",
    "Западно-Казахстанская область",
    "Карагандинская область",
    "Костанайская область",
    "Кызылординская область",
    "Мангистауская область",
    "Павлодарская область",
    "Северо-Казахстанская область",
    "Туркестанская область",
    "Улытауская область",
    "г. Астана",
    "г. Алматы",
    "г. Шымкент",
]

REGIONS_SET = frozenset(REGIONS_KZ)


def validate_region(region: str | None) -> bool:
    """Return True if region is None/empty or in REGIONS_KZ."""
    if not region or not str(region).strip():
        return True
    return str(region).strip() in REGIONS_SET
