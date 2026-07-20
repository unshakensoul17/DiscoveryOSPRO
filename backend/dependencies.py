from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from database import get_db
from config import settings
from models.user import User

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Authorization header missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = credentials.credentials
    
    # Check for demo tokens — ONLY allowed if explicitly enabled AND in development mode
    if token in ("demo-token", "mock-access-token"):
        if not (getattr(settings, "ALLOW_DEMO_TOKENS", False) and settings.ENV == "development"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Demo authentication tokens are disabled.",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Ensure demo user exists in database
        demo_id = "u-demo" if token == "demo-token" else "1"
        demo_email = "researcher@discoveryos.io" if token == "demo-token" else "user@example.com"
        demo_name = "Dr. Evelyn Vance" if token == "demo-token" else "Default User"
        
        user = db.query(User).filter(User.id == demo_id).first()
        if not user:
            user = User(
                id=demo_id,
                email=demo_email,
                hashed_password="demo-hashed-password",
                name=demo_name,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "is_active": user.is_active
        }

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token payload.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token or expired session.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive."
        )
        
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "is_active": user.is_active
    }

def verify_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from models.workspace import Workspace
    from sqlalchemy import or_
    user_id = current_user.get("id")
    
    ws = db.query(Workspace).filter(
        Workspace.id == workspace_id,
        Workspace.deleted_at.is_(None)
    ).first()

    if not ws:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found."
        )

    # Claim ownership if workspace is unowned (e.g., initial seed data)
    if ws.owner_id is None:
        ws.owner_id = user_id
        db.commit()
        db.refresh(ws)
    elif ws.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not own this workspace."
        )

    return ws
