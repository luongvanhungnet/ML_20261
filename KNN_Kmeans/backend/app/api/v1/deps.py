from typing import Optional
from fastapi import Depends, HTTPException, status, Header, Cookie
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_access_token
from app.db.models import User

def get_current_user(
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
) -> User:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    elif access_token:
        token = access_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )

    user_email = payload["sub"]
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator permissions are required to perform this action."
        )
    return current_user
