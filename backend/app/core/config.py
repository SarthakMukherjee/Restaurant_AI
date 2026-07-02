"""
Application configuration.

Loads configuration from environment variables or the .env file.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ==========================================================
    # Application
    # ==========================================================
    APP_NAME: str = "AI-Powered Restaurant Management System"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # ==========================================================
    # Database
    # ==========================================================
    DATABASE_URL: str

    # ==========================================================
    # Authentication / JWT
    # ==========================================================
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ==========================================================
    # GROQ AI
    # ==========================================================
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # ==========================================================
    # CORS
    # ==========================================================
    CORS_ORIGINS: list[str]

    # ==========================================================
    # First Admin Bootstrap
    # ==========================================================
    FIRST_ADMIN_EMAIL: str
    FIRST_ADMIN_PASSWORD: str
    FIRST_ADMIN_NAME: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


settings = get_settings()