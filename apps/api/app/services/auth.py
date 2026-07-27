"""Authentication services for Phase 2: magic-link issuance + JWT mint/verify.

Sessions are stored as short-lived HS256 JWTs signed with ``AGENTPATCH_JWT_SECRET``.
Two principal flavors are supported:

- ``session`` (real user, full access)
- ``demo`` (read-only access into the pre-seeded demo project)

The same JWT shape is used for both; the ``principal`` claim tells `dependencies.py`
what scope to enforce. ``verify_api_key`` continues to work so ingest routes and
SDK callers do not need to migrate.
"""

import datetime
import os
import secrets
from typing import Any, Dict, Optional

import jwt
from sqlalchemy.orm import Session

from app.db import SessionLocal, utc_now, utc_ts
from app.models import MagicLinkToken, Project, User


JWT_ALGORITHM = "HS256"
DEFAULT_TTL_HOURS = 24
DEMO_EMAIL = "demo@agentpatch.local"
DEMO_PROJECT_SLUG = "default"


def get_jwt_secret() -> str:
    return os.getenv(
        "AGENTPATCH_JWT_SECRET",
        # Stable fallback for local dev so tokens survive restarts.
        os.getenv("AGENTPATCH_API_KEY", "change-me-in-production") + ":jwt",
    )


def mint_jwt(
    *,
    principal: str,
    subject: str,
    project_id: Optional[str] = None,
    ttl_hours: int = DEFAULT_TTL_HOURS,
    scopes: Optional[list[str]] = None,
) -> Dict[str, Any]:
    """Mint a JWT and return the encoded string + cookie hints."""
    now = utc_now()
    expires = now + datetime.timedelta(hours=ttl_hours)
    payload: Dict[str, Any] = {
        "sub": subject,
        "principal": principal,
        "iat": utc_ts(now),
        "exp": utc_ts(expires),
        "scopes": scopes or [],
    }
    if project_id:
        payload["project_id"] = project_id
    token = jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)
    return {
        "token": token,
        "expires_at": expires,
        "cookie_name": "agentpatch.session" if principal == "session" else "agentpatch.demo",
        "subject": subject,
        "principal": principal,
        "project_id": project_id,
        "scopes": payload["scopes"],
    }


def verify_jwt(token: str) -> Optional[Dict[str, Any]]:
    """Return the decoded claims if the token is valid and unexpired, else None."""
    try:
        return jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def issue_magic_link(
    db: Session,
    *,
    email: str,
    purpose: str = "session",
    project_id: Optional[str] = None,
    ttl_hours: int = 24,
) -> MagicLinkToken:
    """Persist a one-time magic-link token. Returns the ORM row."""
    record = MagicLinkToken(
        token=secrets.token_urlsafe(32),
        email=email.lower().strip(),
        purpose=purpose,
        project_id=project_id,
        expires_at=utc_now() + datetime.timedelta(hours=ttl_hours),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def consume_magic_link(db: Session, token_value: str) -> Optional[MagicLinkToken]:
    """Mark a magic-link consumed if it is valid and unexpired."""
    record = db.query(MagicLinkToken).filter(MagicLinkToken.token == token_value).first()
    if not record or record.consumed_at is not None:
        return None
    if record.expires_at and utc_ts(record.expires_at) < utc_ts(utc_now()):
        return None
    record.consumed_at = utc_now()
    db.commit()
    db.refresh(record)
    return record


def ensure_user(
    db: Session,
    email: str,
    *,
    role: str = "member",
) -> User:
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user:
        user = User(email=email.lower().strip(), role=role)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def ensure_demo_project(db: Session, api_key: str) -> Project:
    """Return (and lazily create) the canonical 'Default' project for demo mode."""
    project = db.query(Project).filter(Project.slug == DEMO_PROJECT_SLUG).first()
    if not project:
        project = Project(name="Demo Workspace", slug=DEMO_PROJECT_SLUG, api_key=api_key)
        db.add(project)
        db.commit()
        db.refresh(project)
    return project


def issue_demo_token(db: Optional[Session] = None) -> Dict[str, Any]:
    """Mint a demo JWT bound to the canonical demo project."""
    if db is None:
        with SessionLocal() as fresh_db:
            master_key = os.getenv("AGENTPATCH_API_KEY", "change-me-in-production")
            project = ensure_demo_project(fresh_db, master_key)
            return mint_jwt(
                principal="demo",
                subject=DEMO_EMAIL,
                project_id=project.id,
                ttl_hours=24,
                scopes=["runs:read", "evals:read"],
            )
    master_key = os.getenv("AGENTPATCH_API_KEY", "change-me-in-production")
    project = ensure_demo_project(db, master_key)
    return mint_jwt(
        principal="demo",
        subject=DEMO_EMAIL,
        project_id=project.id,
        ttl_hours=24,
        scopes=["runs:read", "evals:read"],
    )


def email_log_path() -> str:
    """Dev-mode mailbox path. The login flow writes the magic link here."""
    basedir = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
    out_dir = os.path.join(basedir, ".dev-mail")
    os.makedirs(out_dir, exist_ok=True)
    return os.path.join(out_dir, "magic-links.log")
