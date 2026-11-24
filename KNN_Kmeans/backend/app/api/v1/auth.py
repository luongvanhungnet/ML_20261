from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.core.security import verify_password, create_access_token
from app.api.v1.schemas import LoginRequest, Token, UserResponse
from app.api.v1.deps import get_current_user
from app.services.audit_service import record_audit

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        record_audit(
            db,
            action="LOGIN_FAILED",
            actor_email=req.email,
            details={"reason": "Invalid email or password"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    token = create_access_token(subject=user.email, role=user.role)

    # Set secure HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False  # Allow local dev over http
    )

    record_audit(
        db,
        action="LOGIN_SUCCESS",
        actor_id=user.id,
        actor_email=user.email,
        details={"role": user.role}
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/logout")
def logout(response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    response.delete_cookie("access_token")
    record_audit(
        db,
        action="LOGOUT",
        actor_id=current_user.id,
        actor_email=current_user.email
    )
    return {"message": "Logged out successfully."}

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
