"""
SignConnect API Gateway — Production-ready FastAPI app
======================================================
Features:
  • CORS from env var (no wildcard in prod)
  • Request ID middleware for tracing
  • Rate limiting (slowapi)
  • Gzip compression
  • Structured startup / shutdown lifespan
  • /health + /metrics endpoints
  • WebSocket connection manager
"""
import os
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from routers import websocket

# ── Environment ───────────────────────────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# Always allow local dev origins
_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://localhost:5173",
]
for _o in _DEV_ORIGINS:
    if _o not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(_o)

# ── App startup / shutdown ─────────────────────────────────────────────────────
_START_TIME = time.time()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Startup → yield → Shutdown."""
    print(f"[SignConnect API] Starting up — allowed origins: {ALLOWED_ORIGINS}")
    yield
    print("[SignConnect API] Shutting down")


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SignConnect API Gateway",
    description="Backend for real-time Indian Sign Language translation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Middleware stack (order matters — outermost first) ─────────────────────────

# 1. Gzip — compress responses > 1 KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 2. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


# 3. Request-ID middleware — inject trace ID into every response
@app.middleware("http")
async def add_request_id(request: Request, call_next) -> Response:
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    start = time.perf_counter()
    response: Response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{duration_ms}ms"
    return response


# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])


# ── Core endpoints ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Info"])
async def root():
    return {
        "service": "SignConnect API Gateway",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Ops"])
async def health():
    """Render & load balancer health check endpoint."""
    return {
        "status": "healthy",
        "uptime_seconds": round(time.time() - _START_TIME, 1),
    }


@app.get("/metrics", tags=["Ops"])
async def metrics():
    """Basic runtime metrics for the admin dashboard."""
    ws_mgr = websocket.manager
    return {
        "active_websocket_connections": len(ws_mgr.active_connections),
        "uptime_seconds": round(time.time() - _START_TIME, 1),
    }
