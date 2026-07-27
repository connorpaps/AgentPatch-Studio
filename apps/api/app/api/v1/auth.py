"""Phase 2 auth router: magic-link request/redeem + demo session bootstrap + whoami."""

import datetime
import json
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.orm import Session

from app.db import get_db, utc_now
from app.dependencies import Principal, get_principal, require_principal
from app.models import MagicLinkToken, User
from app.services.auth import (
    consume_magic_link,
    email_log_path,
    ensure_demo_project,
    ensure_user,
    issue_demo_token,
    issue_magic_link,
    mint_jwt,
)

router = APIRouter(tags=["auth"])


class MagicLinkRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    email: EmailStr
    project_slug: Optional[str] = None


class MagicLinkRedeem(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    token: str = Field(..., min_length=8)


class DemoSessionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    cookie_name: str
    cookie_value: str
    max_age_seconds: int
    subject: str
    principal: str
    project_id: Optional[str] = None


class WhoAmIResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    principal: str
    subject: Optional[str] = None
    project_id: Optional[str] = None
    scopes: list[str] = []


class DevTokenSample(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    token: str
    email: str
    issued_at: str


def _set_jwt_cookie(response: Response, *, name: str, value: str, max_age: int) -> None:
    secure = os.getenv("AGENTPATCH_SECURE_COOKIES", "false").lower() == "true"
    response.set_cookie(
        key=name,
        value=value,
        max_age=max_age,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


def _append_dev_mail(record) -> None:
    """Write a JSON-line record to the dev mailbox so test code and the
    login page can fall back to a copy-paste token in absence of real email."""
    mailbox = email_log_path()
    payload = {
        "issued_at": utc_now().isoformat(),
        "email": record.email,
        "purpose": record.purpose,
        "token": record.token,
        "expires_at": record.expires_at.isoformat() if record.expires_at else None,
    }
    with open(mailbox, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload) + "\n")


@router.post("/auth/magic-link/request", status_code=status.HTTP_204_NO_CONTENT)
def request_magic_link(
    payload: MagicLinkRequest, db: Session = Depends(get_db)
) -> Response:
    """Issue a magic-link token (development convenience)."""
    record = issue_magic_link(
        db,
        email=payload.email,
        purpose="session",
        project_id=None,
        ttl_hours=24,
    )
    _append_dev_mail(record)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/auth/magic-link/redeem", response_model=DemoSessionResponse)
def redeem_magic_link(
    payload: MagicLinkRedeem, response: Response, db: Session = Depends(get_db)
):
    """Exchange a magic-link token for an `agentpatch.session` cookie."""
    record = consume_magic_link(db, payload.token)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired link",
        )

    user = ensure_user(db, record.email, role="member")
    session = mint_jwt(
        principal="session",
        subject=user.email,
        project_id=record.project_id,
        scopes=[
            "runs:read",
            "runs:write",
            "evals:read",
            "evals:write",
            "settings:write",
        ],
        ttl_hours=24,
    )
    _set_jwt_cookie(
        response,
        name=session["cookie_name"],
        value=session["token"],
        max_age=24 * 3600,
    )
    return DemoSessionResponse(
        cookie_name=session["cookie_name"],
        cookie_value=session["token"],
        max_age_seconds=24 * 3600,
        subject=session["subject"],
        principal=session["principal"],
        project_id=session["project_id"],
    )


@router.post("/auth/demo", response_model=DemoSessionResponse)
def issue_demo_session(response: Response, db: Session = Depends(get_db)):
    """Issue a 24h demo session bound to the pre-seeded 'Demo Workspace'."""
    session = issue_demo_token(db)
    _set_jwt_cookie(
        response,
        name=session["cookie_name"],
        value=session["token"],
        max_age=24 * 3600,
    )
    return DemoSessionResponse(
        cookie_name=session["cookie_name"],
        cookie_value=session["token"],
        max_age_seconds=24 * 3600,
        subject=session["subject"],
        principal=session["principal"],
        project_id=session["project_id"],
    )


@router.get("/auth/magic-link/sample", response_model=DevTokenSample)
def magic_link_sample(email: Optional[str] = None, db: Session = Depends(get_db)):
    """Dev-only convenience: return the most recent unconsumed magic-link
    issued for ``email`` (must match) so the login page can fall back to a
    copy-paste link in absence of email infrastructure."""
    if os.getenv("AGENTPATCH_ENV", "development") == "production":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not found"
        )
    query = db.query(MagicLinkToken).filter(MagicLinkToken.consumed_at.is_(None))
    if email:
        query = query.filter(MagicLinkToken.email == email.strip().lower())
    record = query.order_by(MagicLinkToken.created_at.desc()).first()
    if not record:
        return DevTokenSample(
            token="",
            email=email or "",
            issued_at=utc_now().isoformat(),
        )
    return DevTokenSample(
        token=record.token,
        email=record.email,
        issued_at=record.created_at.isoformat() if record.created_at else "",
    )


@router.get(
    "/auth/me",
    response_model=WhoAmIResponse,
    dependencies=[Depends(require_principal)],
)
def whoami(
    request: Request,
    principal: Principal = Depends(get_principal),
) -> WhoAmIResponse:
    return WhoAmIResponse(
        principal=principal.kind,
        subject=principal.subject,
        project_id=principal.project_id,
        scopes=principal.scopes,
    )


@router.post(
    "/auth/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_principal)],
)
def logout(response: Response) -> Response:
    for cookie_name in ("agentpatch.session", "agentpatch.demo"):
        response.delete_cookie(cookie_name, path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
