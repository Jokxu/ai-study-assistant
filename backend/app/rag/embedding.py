# -*- coding: utf-8 -*-
"""Embedding service. Lazy-loads all-MiniLM-L6-v2 for semantic embeddings. Falls back to hash."""
import asyncio
import hashlib
import math
import os

from app.config import settings

_semantic_model = None
_semantic_loaded = False
_embedding_dim = 512
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")


def _hash_embedding(text: str, dim: int = 384) -> list[float]:
    words = text.lower().split()
    vec = [0.0] * dim
    for word in words:
        h = hashlib.md5(word.encode()).digest()
        idx = int.from_bytes(h[:4], "little") % dim
        vec[idx] += 1.0
    mag = math.sqrt(sum(v * v for v in vec))
    if mag > 0:
        vec = [v / mag for v in vec]
    return vec


async def _ensure_model():
    global _semantic_model, _semantic_loaded, _embedding_dim
    if _semantic_loaded:
        return
    _semantic_loaded = True
    try:
        from sentence_transformers import SentenceTransformer
        model_name = getattr(settings, "embedding_model", "BAAI/bge-small-zh-v1.5")
        loop = asyncio.get_event_loop()
        _semantic_model = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: SentenceTransformer(model_name, trust_remote_code=True)),
            timeout=30.0,
        )
        _embedding_dim = _semantic_model.get_sentence_embedding_dimension()
        print(f"[Embedding] Semantic model active: {model_name} ({_embedding_dim}d)")
    except Exception as e:
        print(f"[Embedding] Using hash fallback: {e}")


async def get_embedding_dim() -> int:
    return _embedding_dim


async def embed_text(text: str) -> list[float]:
    if not _semantic_loaded:
        await _ensure_model()
    if _semantic_model is not None:
        try:
            loop = asyncio.get_event_loop()
            emb = await loop.run_in_executor(None, _semantic_model.encode, text)
            return emb.tolist()
        except Exception:
            pass
    return _hash_embedding(text, _embedding_dim)


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts with concurrency limit of 10."""
    sem = asyncio.Semaphore(10)
    async def _limited(t: str) -> list[float]:
        async with sem:
            return await embed_text(t)
    tasks = [_limited(t) for t in texts]
    return await asyncio.gather(*tasks)
