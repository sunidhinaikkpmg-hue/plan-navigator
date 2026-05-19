import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv


# Search for .env starting from the current directory upwards
load_dotenv()


def _build_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    password = os.getenv("DB_PASSWORD") or os.getenv("POSTGRES_PASSWORD") or os.getenv("password") or ""
    user = os.getenv("DB_USER") or os.getenv("POSTGRES_USER") or "postgres"
    host = os.getenv("DB_HOST") or os.getenv("POSTGRES_HOST") or "127.0.0.1"
    port = os.getenv("DB_PORT") or os.getenv("POSTGRES_PORT") or "5432"
    database = os.getenv("DB_NAME") or os.getenv("POSTGRES_DB") or "postgres"
    return str(
        URL.create(
            drivername="postgresql+psycopg2",
            username=user,
            password=password,
            host=host,
            port=int(port),
            database=database,
        )
    )


DATABASE_URL = _build_database_url()

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    with SessionLocal() as db:
        yield db
        
 
 