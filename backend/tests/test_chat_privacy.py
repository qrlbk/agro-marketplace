from types import SimpleNamespace

from starlette.datastructures import Headers

from app.config import settings
from app.dependencies import get_real_ip
from app.services.chat_assistant import mask_sensitive_values


def _dummy_request(xff: str | None, client_ip: str):
    headers = Headers({"x-forwarded-for": xff} if xff else {})
    return SimpleNamespace(headers=headers, client=SimpleNamespace(host=client_ip))


def test_mask_sensitive_values_masks_phone_bin_and_coordinates():
    text = "Свяжитесь по +77001112233 или 8 (700) 111-22-33, БИН 123456789012, точка 43.2567, 76.9234."
    masked = mask_sensitive_values(text)
    assert "[PHONE]" in masked
    assert "[BIN]" in masked
    assert "[COORD]" in masked
    assert "+7700" not in masked


def test_get_real_ip_prefers_forwarded_for_for_trusted_proxy(monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxies", "10.0.0.1")
    request = _dummy_request("203.0.113.5, 198.51.100.2", "10.0.0.1")
    assert get_real_ip(request) == "203.0.113.5"


def test_get_real_ip_returns_direct_ip_for_untrusted_proxy(monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxies", "")
    request = _dummy_request("203.0.113.5", "10.0.0.5")
    assert get_real_ip(request) == "10.0.0.5"
