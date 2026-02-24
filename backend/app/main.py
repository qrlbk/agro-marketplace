import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.config import settings
from app.database import get_db
from app.routers import auth, products, machines, garage, cart, checkout, orders, vendor_upload, vendors, recommendations, webhooks, admin, categories, search, chat, notifications, feedback, staff, regions

logger = logging.getLogger(__name__)

# Директория загрузок (фото товаров): backend/uploads
UPLOADS_ROOT = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_ROOT.mkdir(parents=True, exist_ok=True)

CORS_ALLOWED_ORIGINS = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"]


def _warn_weak_jwt_secret() -> None:
    secret = (settings.jwt_secret or "").strip()
    if not secret or secret in ("change-me", "change-me-to-random-secret-in-production"):
        logger.warning(
            "JWT_SECRET is default or empty. Set a strong secret in production (e.g. openssl rand -hex 32)."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _warn_weak_jwt_secret()
    yield


app = FastAPI(title="Agro Marketplace API", version="0.1.0", docs_url="/docs", redoc_url="/redoc", lifespan=lifespan)


def _cors_headers_for_request(request: Request) -> dict[str, str]:
    """Return CORS headers if request Origin is in allowed list (for error responses)."""
    origin = request.headers.get("origin")
    if origin and origin in CORS_ALLOWED_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    return {}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    response = JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    for k, v in _cors_headers_for_request(request).items():
        response.headers[k] = v
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    response = JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
    for k, v in _cors_headers_for_request(request).items():
        response.headers[k] = v
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(machines.router, prefix="/machines", tags=["machines"])
app.include_router(garage.router, prefix="/garage", tags=["garage"])
app.include_router(cart.router, prefix="/cart", tags=["cart"])
app.include_router(checkout.router, prefix="/checkout", tags=["checkout"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(vendor_upload.router, prefix="/vendor", tags=["vendor"])
app.include_router(vendors.router, prefix="/vendors", tags=["vendors"])
app.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(categories.router, prefix="/categories", tags=["categories"])
app.include_router(regions.router, prefix="/regions", tags=["regions"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
app.include_router(feedback.router, prefix="/feedback", tags=["feedback"])
app.include_router(staff.router, prefix="/staff", tags=["staff"])

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_ROOT)), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready():
    """Readiness: PostgreSQL and Redis must be reachable. Returns 503 if not (for orchestrator/load balancer)."""
    from sqlalchemy import text
    from app.database import engine
    from app.services.redis_client import get_redis

    errors = []
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        errors.append(f"postgres: {e}")

    try:
        r = await get_redis()
        await r.ping()
    except Exception as e:
        errors.append(f"redis: {e}")

    if errors:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "errors": errors},
        )
    return {"status": "ready"}


@app.get("/health/openai")
async def health_openai():
    """Проверка OpenAI: подхватился ли ключ и отвечает ли API. Показывает причину ошибки."""
    try:
        from app.config import settings
        from app.services.llm_client import get_openai_client

        key_set = bool(settings.openai_api_key and str(settings.openai_api_key).strip())
        if not key_set:
            return {"key_set": False, "error": "OPENAI_API_KEY не задан в .env или пустой"}

        client = get_openai_client()
        if not client:
            return {"key_set": True, "error": "Клиент OpenAI не создаётся (проверьте ключ)"}

        resp = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": "Say OK"}],
            max_tokens=5,
        )
        text = (resp.choices[0].message.content or "").strip()
        return {"key_set": True, "ok": True, "reply": text}
    except Exception as e:
        return {"key_set": True, "ok": False, "error": str(e)}
