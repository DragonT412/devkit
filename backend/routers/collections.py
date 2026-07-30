import json
from fastapi import APIRouter, HTTPException
from backend.database import get_db
from backend.models import CollectionCreate, CollectionUpdate, CollectionRequestCreate, CollectionRequestUpdate

router = APIRouter(prefix="/api/collections", tags=["collections"])


@router.get("")
async def list_collections():
    db = await get_db()
    cursor = await db.execute("SELECT * FROM collections ORDER BY created_at DESC")
    rows = await cursor.fetchall()
    await db.close()
    return [dict(row) for row in rows]


@router.post("")
async def create_collection(data: CollectionCreate):
    db = await get_db()
    cursor = await db.execute("INSERT INTO collections (name) VALUES (?)", (data.name,))
    await db.commit()
    collection_id = cursor.lastrowid
    await db.close()
    return {"id": collection_id, "name": data.name}


@router.put("/{collection_id}")
async def update_collection(collection_id: int, data: CollectionUpdate):
    db = await get_db()
    cursor = await db.execute("UPDATE collections SET name = ? WHERE id = ?", (data.name, collection_id))
    await db.commit()
    if cursor.rowcount == 0:
        await db.close()
        raise HTTPException(status_code=404, detail="Collection not found")
    await db.close()
    return {"ok": True}


@router.delete("/{collection_id}")
async def delete_collection(collection_id: int):
    db = await get_db()
    await db.execute("DELETE FROM collections WHERE id = ?", (collection_id,))
    await db.commit()
    await db.close()
    return {"ok": True}


@router.get("/{collection_id}/requests")
async def list_collection_requests(collection_id: int):
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM collection_requests WHERE collection_id = ? ORDER BY id ASC",
        (collection_id,)
    )
    rows = await cursor.fetchall()
    await db.close()
    result = []
    for row in rows:
        d = dict(row)
        d["headers"] = json.loads(d.get("headers", "{}"))
        result.append(d)
    return result


@router.post("/{collection_id}/requests")
async def add_request_to_collection(collection_id: int, data: CollectionRequestCreate):
    db = await get_db()
    cursor = await db.execute("SELECT id FROM collections WHERE id = ?", (collection_id,))
    if not await cursor.fetchone():
        await db.close()
        raise HTTPException(status_code=404, detail="Collection not found")

    cursor = await db.execute(
        "INSERT INTO collection_requests (collection_id, name, method, url, headers, body) VALUES (?, ?, ?, ?, ?, ?)",
        (collection_id, data.name, data.method, data.url, json.dumps(data.headers), data.body)
    )
    await db.commit()
    req_id = cursor.lastrowid
    await db.close()
    return {"id": req_id, "name": data.name}


@router.put("/{collection_id}/requests/{request_id}")
async def update_collection_request(collection_id: int, request_id: int, data: CollectionRequestUpdate):
    db = await get_db()
    updates = {}
    if data.name is not None:
        updates["name"] = data.name
    if data.method is not None:
        updates["method"] = data.method
    if data.url is not None:
        updates["url"] = data.url
    if data.headers is not None:
        updates["headers"] = json.dumps(data.headers)
    if data.body is not None:
        updates["body"] = data.body

    if not updates:
        await db.close()
        return {"ok": True}

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [request_id, collection_id]
    cursor = await db.execute(
        f"UPDATE collection_requests SET {set_clause} WHERE id = ? AND collection_id = ?",
        values
    )
    await db.commit()
    if cursor.rowcount == 0:
        await db.close()
        raise HTTPException(status_code=404, detail="Request not found")
    await db.close()
    return {"ok": True}


@router.delete("/{collection_id}/requests/{request_id}")
async def delete_collection_request(collection_id: int, request_id: int):
    db = await get_db()
    await db.execute(
        "DELETE FROM collection_requests WHERE id = ? AND collection_id = ?",
        (request_id, collection_id)
    )
    await db.commit()
    await db.close()
    return {"ok": True}
