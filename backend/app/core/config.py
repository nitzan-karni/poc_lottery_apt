from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/lottery"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # S3 / File Storage
    S3_BUCKET: str = "lottery-documents"
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_ENDPOINT: Optional[str] = None  # For MinIO: http://localhost:9000

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Email
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "Ezra VaBitaron <noreply@lottery.e-b.co.il>"

    # Auth
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # App
    APP_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
