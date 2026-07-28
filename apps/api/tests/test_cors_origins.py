"""Regression tests for CORS origins parsing in apps.api.app.main.

The original implementation was:
    origins = [o.strip() for o in os.getenv("FRONTEND_ORIGIN")
               or os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
               if o.strip()]

When ``FRONTEND_ORIGIN`` was set (e.g. ``https://x.com``), ``os.getenv``
returned a non-empty string which is truthy, so the ``or`` short-circuited
to the entire URL string. The list comprehension then iterated over EACH
CHARACTER of the URL, producing garbage like
``['h','t','t','p','s',':','/','/','x',...]``. That silently broke CORS
for every production deploy with ``FRONTEND_ORIGIN`` set.

These tests pin the contract of the corrected parser so a future
regression has to delete or amend this file to land.

Why we don't reload ``app.main``
--------------------------------
Importing ``app.main`` runs ``create_app()`` at module top-level and
returns a singleton FastAPI instance. Other test files capture that
singleton (``from app.main import app`` in test_smoke and test_auth).
Pushing ``sys.modules.pop("app.main", None)`` and re-importing would
construct a brand-new app instance and silently invalidate every
reference held by sibling test modules, breaking them.

Instead we call the already-public ``create_app()`` function fresh per
test to build a *dedicated* FastAPI instance for the assertion; the
singleton app stays untouched, env mutations are scoped to
``monkeypatch`` so they auto-revert, and there is no module-cache
invalidation.
"""

from __future__ import annotations

import os

import pytest
from fastapi.middleware.cors import CORSMiddleware

from app.main import create_app


def _resolve_origins(monkeypatch: pytest.MonkeyPatch, env: dict[str, str] | None) -> list[str]:
    """Build a fresh FastAPI app under the given env and return its
    CORSMiddleware allow_origins list.

    ``AGENTPATCH_ENV`` is intentionally NOT touched here: the warning
    gate keys off that var, so the capsys tests need to control it
    themselves without the helper undoing their setup. monkeypatch is
    function-scoped so it auto-reverts at end of test.
    """
    for key in ("FRONTEND_ORIGIN", "ALLOWED_ORIGINS"):
        monkeypatch.delenv(key, raising=False)
    if env:
        for key, value in env.items():
            monkeypatch.setenv(key, value)

    fresh_app = create_app()
    cors_middleware = next(
        m for m in fresh_app.user_middleware if m.cls is CORSMiddleware
    )
    # FastAPI calls Starlette's ``Middleware(cls, *args, **kwargs)`` for
    # ``add_middleware`` -- positional args become ``m.args`` and keyword
    # arguments become ``m.kwargs``. allow_origins is passed as a kwarg, so
    # it lives under ``m.kwargs``.
    return list(cors_middleware.kwargs["allow_origins"])


def test_single_origin_via_frontend_origin(monkeypatch):
    origins = _resolve_origins(
        monkeypatch,
        {"FRONTEND_ORIGIN": "https://agent-patch-studio-web.vercel.app"},
    )
    assert origins == ["https://agent-patch-studio-web.vercel.app"]


def test_comma_separated_multi_origin(monkeypatch):
    origins = _resolve_origins(
        monkeypatch,
        {"FRONTEND_ORIGIN": "https://a.com, https://b.com ,https://c.com"},
    )
    assert origins == ["https://a.com", "https://b.com", "https://c.com"]


def test_unset_falls_back_to_allowed_origins(monkeypatch):
    origins = _resolve_origins(monkeypatch, {"ALLOWED_ORIGINS": "https://fallback.com"})
    assert origins == ["https://fallback.com"]


def test_empty_string_falls_back_to_default(monkeypatch):
    # An empty FRONTEND_ORIGIN is falsy and triggers the fallback path.
    origins = _resolve_origins(monkeypatch, {"FRONTEND_ORIGIN": ""})
    assert origins == ["http://localhost:3000"]


def test_no_envs_falls_back_to_localhost(monkeypatch):
    origins = _resolve_origins(monkeypatch, None)
    assert origins == ["http://localhost:3000"]


@pytest.mark.parametrize(
    "url",
    [
        "https://agent-patch-studio-web.vercel.app",
        "https://example.org",
        "http://localhost:5173",
    ],
)
def test_origin_is_not_split_into_characters(monkeypatch, url):
    """The original bug iterated a string into single characters. If this
    test ever fails, the parser has regressed back to that path.
    """
    origins = _resolve_origins(monkeypatch, {"FRONTEND_ORIGIN": url})
    assert len(origins) == 1
    assert origins[0] == url
    assert all(len(o) > 1 for o in origins)


def test_cors_warning_fires_when_production_without_frontend_origin(
    monkeypatch, capsys
):
    """The deploy-mode CORS warning guards against the operator forgetting to
    set FRONTEND_ORIGIN. We assert the warning text lands in stderr.
    """
    monkeypatch.delenv("FRONTEND_ORIGIN", raising=False)
    monkeypatch.setenv("AGENTPATCH_ENV", "production")
    _resolve_origins(monkeypatch, None)
    captured = capsys.readouterr()
    assert "AGENTPATCH_ENV=production but FRONTEND_ORIGIN is unset" in captured.err


def test_cors_warning_does_not_fire_when_frontend_origin_is_set(
    monkeypatch, capsys
):
    monkeypatch.setenv("AGENTPATCH_ENV", "production")
    monkeypatch.setenv("FRONTEND_ORIGIN", "https://agent-patch-studio-web.vercel.app")
    _resolve_origins(
        monkeypatch, {"FRONTEND_ORIGIN": "https://agent-patch-studio-web.vercel.app"}
    )
    captured = capsys.readouterr()
    assert "[agentpatch] WARNING" not in captured.err


def test_cors_warning_does_not_fire_in_development(monkeypatch, capsys):
    monkeypatch.delenv("FRONTEND_ORIGIN", raising=False)
    monkeypatch.delenv("AGENTPATCH_ENV", raising=False)
    _resolve_origins(monkeypatch, None)
    captured = capsys.readouterr()
    assert "[agentpatch] WARNING" not in captured.err
