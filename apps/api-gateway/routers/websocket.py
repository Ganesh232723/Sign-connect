"""
WebSocket Router — SignConnect API Gateway
==========================================
Handles real-time sign language translation streams.

Endpoints:
  /ws/translate  — main translation channel (frame → gesture → text)
  /ws/echo       — connection health check / ping-pong
"""
import asyncio
import json
import time
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, WebSocketException, status

router = APIRouter()


# ── WebSocket Connection Manager ──────────────────────────────────────────────
class ConnectionManager:
    """
    Thread-safe WebSocket connection pool.
    Supports broadcasting to all clients or sending to one.
    """

    def __init__(self) -> None:
        # Map of connection_id → WebSocket
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket) -> str:
        await websocket.accept()
        conn_id = f"conn_{int(time.time() * 1000)}"
        self.active_connections[conn_id] = websocket
        print(f"[WS] Client connected: {conn_id} | total={len(self.active_connections)}")
        return conn_id

    def disconnect(self, conn_id: str) -> None:
        self.active_connections.pop(conn_id, None)
        print(f"[WS] Client disconnected: {conn_id} | total={len(self.active_connections)}")

    async def send_json(self, conn_id: str, data: dict[str, Any]) -> None:
        ws = self.active_connections.get(conn_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(conn_id)

    async def broadcast(self, data: dict[str, Any]) -> None:
        dead: list[str] = []
        for conn_id, ws in self.active_connections.items():
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(conn_id)
        for conn_id in dead:
            self.disconnect(conn_id)


# Singleton — imported by main.py for /metrics
manager = ConnectionManager()


# ── Max message size guard ────────────────────────────────────────────────────
_MAX_MESSAGE_BYTES = 512 * 1024  # 512 KB — a single Base64 video frame is ~50–80 KB


# ── /ws/translate ──────────────────────────────────────────────────────────────
@router.websocket("/translate")
async def websocket_translate(websocket: WebSocket):
    """
    Main translation WebSocket.

    Client → Server messages (JSON):
      { type: "frame",  data: "<base64-jpeg>", timestamp: <ms> }
      { type: "ping" }

    Server → Client responses (JSON):
      { type: "pong" }
      { type: "result", sign: "Hello", confidence: 0.91, timestamp: <ms> }
      { type: "error", message: "..." }
    """
    conn_id = await manager.connect(websocket)
    try:
        while True:
            # Receive with timeout — drop stale idle connections
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
            except asyncio.TimeoutError:
                await manager.send_json(conn_id, {"type": "timeout", "message": "Idle timeout — reconnect"})
                break

            # Guard against oversized payloads
            if len(raw.encode()) > _MAX_MESSAGE_BYTES:
                await manager.send_json(conn_id, {"type": "error", "message": "Message too large"})
                continue

            # Parse JSON
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await manager.send_json(conn_id, {"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type", "")

            # ── Ping / keep-alive ──────────────────────────────────────────────
            if msg_type == "ping":
                await manager.send_json(conn_id, {"type": "pong", "timestamp": int(time.time() * 1000)})
                continue

            # ── Video frame for gesture recognition ───────────────────────────
            if msg_type == "frame":
                # TODO: Forward base64 frame to inference-service (port 8001) via httpx
                # For now, return an acknowledgement so the client knows connection is live.
                await manager.send_json(conn_id, {
                    "type": "ack",
                    "message": "Frame received — inference pipeline coming soon",
                    "timestamp": msg.get("timestamp"),
                    "conn_id": conn_id,
                })
                continue

            # ── Unknown message type ───────────────────────────────────────────
            await manager.send_json(conn_id, {
                "type": "error",
                "message": f"Unknown message type: {msg_type!r}",
            })

    except WebSocketDisconnect:
        pass
    except WebSocketException as exc:
        print(f"[WS] WebSocketException on {conn_id}: {exc}")
    finally:
        manager.disconnect(conn_id)


# ── /ws/echo — health check / latency test ────────────────────────────────────
@router.websocket("/echo")
async def websocket_echo(websocket: WebSocket):
    """Echo server for latency testing. Sends back every message with a timestamp."""
    await websocket.accept()
    try:
        while True:
            text = await websocket.receive_text()
            await websocket.send_text(json.dumps({
                "echo": text,
                "server_time_ms": int(time.time() * 1000),
            }))
    except WebSocketDisconnect:
        pass
