from pydantic_settings import BaseSettings
from typing import List

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
    AI_PRIMARY_MODEL: str = "gemini-1.5-pro"
    AI_FALLBACK_MODEL: str = "llama-3.1-70b-versatile"
    
    # AWS
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: str = "discoveryos-uploads"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://app.discoveryos.com"
    ]
    
    # Environment
    ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()