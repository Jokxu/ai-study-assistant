# -*- coding: utf-8 -*-
"""Qdrant vector store for RAG document chunks."""

import uuid
from typing import Optional

from app.config import settings

COLLECTION_NAME = "study_assistant"


def _get_client():
    """Get a Qdrant client, or None if not available. Retries up to 3 times."""
    from app.logging_config import logger
    for attempt in range(3):
        try:
            from qdrant_client import QdrantClient as SyncClient
            client = SyncClient(host=settings.qdrant_host, port=settings.qdrant_port, timeout=60)
            client.get_collections()
            return client
        except Exception as e:
            logger.error(f"Qdrant connection attempt {attempt+1}/3 failed: {e}")
            if attempt < 2:
                import time
                time.sleep(2)
    return None


async def ensure_collection(dim: int = 384):
    """Create the Qdrant collection if it doesn't exist."""
    try:
        from qdrant_client import QdrantClient as SyncClient
        from qdrant_client.http import models

        client = SyncClient(host=settings.qdrant_host, port=settings.qdrant_port, timeout=60)
        collections = client.get_collections().collections
        names = [c.name for c in collections]

        if COLLECTION_NAME not in names:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=models.VectorParams(
                    size=dim,
                    distance=models.Distance.COSINE,
                ),
            )
        return True
    except Exception:
        return False


async def add_chunks(doc_id: int, chunks: list[str], course_id: int) -> bool:
    """Store chunks as vectors in Qdrant."""
    from app.rag.embedding import embed_batch

    client = _get_client()
    if not client:
        return False

    from qdrant_client.http import models

    vectors = await embed_batch(chunks)

    points = []
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        points.append(models.PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                "doc_id": doc_id,
                "course_id": course_id,
                "chunk_index": i,
                "text": chunk,
            },
        ))

    from itertools import islice
    it = iter(points)
    while True:
        batch = list(islice(it, 100))
        if not batch:
            break
        client.upsert(collection_name=COLLECTION_NAME, points=batch, wait=True)

    return True


async def search(query: str, top_k: int = 5, course_id: Optional[int] = None) -> list[dict]:
    """Search for similar chunks using vector similarity."""
    from app.rag.embedding import embed_text

    client = _get_client()
    if not client:
        return []

    query_vector = await embed_text(query)

    from qdrant_client.http import models

    query_filter = None
    if course_id is not None:
        query_filter = models.Filter(
            must=[models.FieldCondition(key="course_id", match=models.MatchValue(value=course_id))]
        )

    result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=top_k,
        query_filter=query_filter,
        score_threshold=0.3,
        with_payload=True,
    )

    return [
        {
            "doc_id": r.payload.get("doc_id"),
            "course_id": r.payload.get("course_id"),
            "text": r.payload.get("text", ""),
            "score": r.score,
        }
        for r in result.points
    ]


async def delete_document(doc_id: int) -> bool:
    """Delete all chunks belonging to a document."""
    client = _get_client()
    if not client:
        return False

    from qdrant_client.http import models

    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=models.Filter(
            must=[models.FieldCondition(key="doc_id", match=models.MatchValue(value=doc_id))]
        ),
        wait=True,
    )
    return True


async def is_available() -> bool:
    """Check if Qdrant is running and accessible."""
    client = _get_client()
    return client is not None

