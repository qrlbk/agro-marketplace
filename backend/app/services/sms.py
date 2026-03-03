import urllib.parse

import httpx
from app.config import settings

SMS_RU_SEND_URL = "https://sms.ru/sms/send"


class SmsGateway:
    """SMS gateway: SMS.ru (sms_provider=sms_ru) or generic POST (sms_api_url + Bearer)."""

    async def send(self, phone: str, text: str) -> bool:
        if settings.sms_provider == "sms_ru":
            api_id = (settings.sms_api_key or "").strip()
            if not api_id:
                return True  # stub for dev
            async with httpx.AsyncClient() as client:
                params = {
                    "api_id": api_id,
                    "to": phone,
                    "msg": text,
                    "json": 1,
                }
                url = f"{SMS_RU_SEND_URL}?{urllib.parse.urlencode(params)}"
                resp = await client.get(url, timeout=10.0)
                if not resp.is_success:
                    return False
                data = resp.json()
                # status_code 100 = success
                if data.get("status") == "OK" and data.get("status_code") == 100:
                    return True
                # single recipient: check sms[phone]
                sms = data.get("sms") or {}
                rec = sms.get(phone) or (list(sms.values())[0] if sms else {})
                return rec.get("status_code") == 100

        if settings.sms_api_url and settings.sms_api_key:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    settings.sms_api_url,
                    json={"phone": phone, "text": text},
                    headers={"Authorization": f"Bearer {settings.sms_api_key}"},
                    timeout=10.0,
                )
                return resp.is_success

        # Stub: no config, dev mode
        return True


sms_gateway = SmsGateway()
