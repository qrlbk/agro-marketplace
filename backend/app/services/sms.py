import httpx
from app.config import settings


class SmsGateway:
    """SMS gateway interface. Implement send() for concrete provider (SMS.ru, SMSC, etc.)."""

    async def send(self, phone: str, text: str) -> bool:
        if not settings.sms_api_url or not settings.sms_api_key:
            # Stub: log and return True for dev
            return True
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                settings.sms_api_url,
                json={"phone": phone, "text": text},
                headers={"Authorization": f"Bearer {settings.sms_api_key}"},
                timeout=10.0,
            )
            return resp.is_success


sms_gateway = SmsGateway()
