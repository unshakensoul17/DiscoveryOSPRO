import uuid
import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from database import get_db
from models.user import User
from config import settings

router = APIRouter(prefix="/auth")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    if not request.email or not request.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )
        
    email_clean = request.email.strip().lower()
    
    # Check if user already exists
    user = db.query(User).filter(User.email == email_clean).first()
    
    if user:
        # Verify password
        if not pwd_context.verify(request.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password for this user email"
            )
    else:
        # Auto-signup user
        hashed_password = pwd_context.hash(request.password)
        name = email_clean.split("@")[0].capitalize() if "@" in email_clean else email_clean.capitalize()
        user = User(
            id=str(uuid.uuid4()),
            email=email_clean,
            hashed_password=hashed_password,
            name=name,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Generate JWT Token
    expires_delta = datetime.timedelta(hours=settings.JWT_EXPIRY_HOURS)
    expire = datetime.datetime.utcnow() + expires_delta
    
    payload = {
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "exp": expire
    }
    
    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return {
        "tokens": {
            "access_token": token,
            "refresh_token": f"refresh-{uuid.uuid4()}",
            "token_type": "bearer",
            "expires_in": settings.JWT_EXPIRY_HOURS * 3600
        },
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "is_active": user.is_active
        }
    }
