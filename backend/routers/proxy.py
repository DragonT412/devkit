import json
import time
import httpx
from fastapi import APIRouter, HTTPException, Request
from backend.database import get_db
from backend.models import ProxyRequest, ProxyResponse

router = APIRouter(prefix="/api", tags=["proxy"])

# Mock endpoint for testing without external network
@router.get("/echo")
async def echo_endpoint(name: str = "world", id: int = 1):
    return {
        "id": id,
        "name": name,
        "message": f"Hello, {name}!",
        "items": [{"key": "value"}, {"key": "value2"}],
        "nested": {"deep": {"value": 42}, "flag": True, "nothing": None},
        "numbers": [1, 2, 3.14, -5],
        "created_at": "2026-07-31T00:00:00Z"
    }

@router.post("/echo")
async def echo_post(request: Request):
    body = {}
    try:
        body = await request.json()
    except:
        pass
    return {"received": body, "method": "POST", "status": "ok"}


@router.post("/proxy", response_model=ProxyResponse)
async def proxy_request(req: ProxyRequest):
    method = req.method.upper()
    url = req.url.strip()

    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    # Parse request body
    request_body_str = req.body or ""
    content = None
    try:
        content = json.loads(request_body_str)
    except (json.JSONDecodeError, TypeError):
        content = request_body_str if request_body_str else None

    headers = {k: v for k, v in req.headers.items() if k.lower() not in ("host", "content-length")}

    start = time.perf_counter()
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        try:
            if content is not None and isinstance(content, (dict, list)):
                resp = await client.request(method, url, headers=headers, json=content)
            elif content:
                resp = await client.request(method, url, headers=headers, content=content)
            else:
                resp = await client.request(method, url, headers=headers)
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Request timed out")
        except httpx.ConnectError:
            raise HTTPException(status_code=502, detail=f"Could not connect to {url}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    duration_ms = (time.perf_counter() - start) * 1000

    # Persist to history
    db = await get_db()
    await db.execute(
        """INSERT INTO history (method, url, request_headers, request_body,
           status_code, response_headers, response_body, duration_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (req.method, req.url, json.dumps(req.headers), req.body or "",
         resp.status_code, json.dumps(dict(resp.headers)), resp.text,
         round(duration_ms, 2))
    )
    await db.commit()
    await db.close()

    return ProxyResponse(
        status_code=resp.status_code,
        headers=dict(resp.headers),
        body=resp.text,
        duration_ms=round(duration_ms, 2)
    )


@router.get("/history")
async def get_history(limit: int = 50, offset: int = 0):
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM history ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset)
    )
    rows = await cursor.fetchall()
    await db.close()
    return [dict(row) for row in rows]


@router.delete("/history/{history_id}")
async def delete_history_item(history_id: int):
    db = await get_db()
    await db.execute("DELETE FROM history WHERE id = ?", (history_id,))
    await db.commit()
    await db.close()
    return {"ok": True}


@router.delete("/history")
async def clear_history():
    db = await get_db()
    await db.execute("DELETE FROM history")
    await db.commit()
    await db.close()
    return {"ok": True}
