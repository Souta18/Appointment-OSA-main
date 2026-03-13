from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from urllib.parse import quote_plus
try:
    from . import config
except Exception:  # pragma: no cover
    import config  # type: ignore

Base = declarative_base()
_engine = None
SessionLocal = None


def _dsn(db_name=None):
    user = quote_plus(config.DB_USER)
    pw = quote_plus(getattr(config, "DB_PASS", getattr(config, "DB_PASSWORD", "")))
    host = config.DB_HOST
    port = config.DB_PORT
    name = db_name or config.DB_NAME
    return f"mysql+pymysql://{user}:{pw}@{host}:{port}/{name}?charset=utf8mb4"


def init_engine_and_session():
    global _engine, SessionLocal
    try:
        _engine = create_engine(_dsn(), pool_pre_ping=True, future=True)
        SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False, future=True)
        with _engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        bootstrap_engine = create_engine(_dsn("mysql"), pool_pre_ping=True, future=True)
        with bootstrap_engine.connect() as conn:
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {config.DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
        _engine = create_engine(_dsn(), pool_pre_ping=True, future=True)
        SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False, future=True)
    return _engine, SessionLocal