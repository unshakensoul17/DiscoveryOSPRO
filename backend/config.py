from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/discoveryos"
    
    # JWT
    JWT_SECRET_KEY: str = "your-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 1
    
    # AI
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    AI_PRIMARY_MODEL: str = "gemini-3.1-flash-lite"
    AI_FALLBACK_MODEL: str = "llama-3.1-70b-versatile"
    
    # AWS
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: str = "discoveryos-uploads"
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://discovery-ospro.vercel.app",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            import json
            # Try JSON array first e.g. '["https://..."]'
            stripped = v.strip()
            if stripped.startswith("["):
                return json.loads(stripped)
            # Fallback: comma-separated string e.g. "https://a.com,https://b.com"
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return v
    
    # Environment
    ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    ALLOW_DEMO_TOKENS: bool = False
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()