from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


# RLS: app must set app.current_user_id per request (see dependencies.get_current_user_optional).
# Default -1 so unauthenticated requests see no rows on RLS-protected tables.
RLS_DEFAULT_USER_ID = "-1"


async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            await session.execute(text(f"SET LOCAL app.current_user_id = {RLS_DEFAULT_USER_ID}"))
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
