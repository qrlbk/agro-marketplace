from logging.config import fileConfig
from sqlalchemy import create_engine
from sqlalchemy.engine import Connection
from alembic import context
from app.config import settings
from app.database import Base
from app.models import *  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
# Use sync URL for migrations (psycopg2 or postgresql driver)
db_url = settings.database_url.replace("+asyncpg", "").replace("postgresql://", "postgresql+psycopg2://")
config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(config.get_main_option("sqlalchemy.url"))
    with connectable.connect() as connection:
        do_run_migrations(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
