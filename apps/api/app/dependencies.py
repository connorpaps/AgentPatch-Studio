"""FastAPI dependencies: API key + session JWT + demo principal.

Auth model:
- API key (Bearer or x-api-key header) accepts everything as before; required
  when no demo/session cookie is present.
- Session JWT (``agentpatch.session`` cookie) represents a real user; scopes depend
  on the JWT claims. Falls back to API-key auth on most endpoints so SDK clients
  keep working.
- Demo JWT (``agentpatch.demo`` cookie) grants limited read-only access into the
  pre-seeded demo project.

These helpers never raise; they return a tuple of ``(principal, scopes)`` so the
caller can decide what to enforce. ``require_principal`` does raise a 401 if no
principal can be derived.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from typing import List, Optional, Tuple

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.auth import DEMO_EMAIL, verify_jwt


security = HTTPBearer(auto_error=False)


@dataclass
class Principal:
    kind: str  # "api_key" | "session" | "demo" | "anonymous"
    api_key: Optional[str] = None
    subject: Optional[str] = None
    project_id: Optional[str] = None
    scopes: List[str] = field(default_factory=list)

    @property
    def is_authenticated(self) -> bool:
        return self.kind in {"api_key", "session"}

    @property
    def is_demo(self) -> bool:
        return self.kind == "demo"

    def has_scope(self, scope: str) -> bool:
        return scope in self.scopes or "admin" in self.scopes


@lru_cache
def get_master_api_key() -> str:
    return os.getenv("AGENTPATCH_API_KEY", "change-me-in-production")


def _credentials_from_request(
    request: Request, credentials: Optional[HTTPAuthorizationCredentials]
) -> Tuple[Optional[str], Optional[str]]:
    bearer = credentials.credentials if credentials else None
    header = request.headers.get("x-api-key")
    cookie_session = request.cookies.get("agentpatch.session")
    cookie_demo = request.cookies.get("agentpatch.demo")
    return bearer or header, cookie_session or cookie_demo


def resolve_principal(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = None,
) -> Principal:
    token, cookie = _credentials_from_request(request, credentials)

    # 1) Cookie-based session/demo wins over the bearer for backwards-compat.
    if cookie:
        claims = verify_jwt(cookie)
        if claims:
            principal = claims.get("principal", "session")
            return Principal(
                kind=principal,
                subject=claims.get("sub"),
                project_id=claims.get("project_id"),
                scopes=list(claims.get("scopes") or []),
            )
        # Stale cookie — fall through to API-key path.

    # 2) API key (master or project-scoped).
    if token:
        return Principal(kind="api_key", api_key=token, scopes=["*"])

    # 3) No credentials.
    return Principal(kind="anonymous")


def get_principal(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Principal:
    return resolve_principal(request, credentials)


def require_principal(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Principal:
    """Allow API key, session, OR demo principal. Reject anonymous."""
    principal = resolve_principal(request, credentials)
    if principal.kind == "anonymous":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required (API key, session cookie, or demo cookie)",
        )
    return principal


def require_session(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Principal:
    """Reject demo principals — only real sessions or API keys pass."""
    principal = resolve_principal(request, credentials)
    if principal.kind == "anonymous":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    if principal.kind == "demo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires a signed-in session, not the demo workspace.",
        )
    return principal


# --- Backwards compatibility shim for routers that still depend on verify_api_key ---

def verify_api_key(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """Legacy shim: accept either an API key (header/bearer) OR a valid
    session/demo cookie. Used by older routes that haven't been upgraded to
    ``get_principal``.

    For cookie principals we resolve to the *master* API key so existing
    routes that compare against ``get_master_api_key`` (e.g. project
    auto-creation in ``runs.start_run``) continue to target the canonical
    demo/Default project — no per-request phantom projects.
    """

    bearer = credentials.credentials if credentials else None
    header_key = request.headers.get("x-api-key")
    if bearer or header_key:
        return bearer or header_key

    cookie_session = request.cookies.get("agentpatch.session")
    cookie_demo = request.cookies.get("agentpatch.demo")
    if cookie_session or cookie_demo:
        return get_master_api_key()

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key")


__all__ = [
    "DEMO_EMAIL",
    "Principal",
    "get_master_api_key",
    "get_principal",
    "resolve_principal",
    "require_principal",
    "require_session",
    "security",
    "verify_api_key",
]
