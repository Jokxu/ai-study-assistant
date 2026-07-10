# -*- coding: utf-8 -*-
import re
from pathlib import Path
from typing import Optional

from app.config import settings
from app.models.document import Document as DocModel

CHUNK_SIZE = 500
CHUNK_OVERLAP = 100


def split_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    if not text.strip():
        return []
    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        if start < 0:
            start = 0
        end = min(start + chunk_size, text_len)
        if end < text_len:
            last_period = text.rfind(".", start, end)
            if last_period > start + chunk_size // 2:
                end = last_period + 1
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        next_start = end - overlap
        if next_start <= start:
            next_start = end
        start = next_start

    return [c for c in chunks if len(c) > 20]
def parse_text(content: str) -> str:
    """Clean and normalize text content"""
    content = re.sub(r"\s+", " ", content)
    return content.strip()


def parse_pdf(file_path: Path) -> str:
    """Extract text from PDF"""
    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(str(file_path))
        text = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text.append(page_text)
        return "\n".join(text)
    except ImportError:
        raise ImportError("PyPDF2 is required for PDF parsing")


def parse_docx(file_path: Path) -> str:
    """Extract text from DOCX"""
    try:
        from docx import Document

        doc = Document(str(file_path))
        return "\n".join(p.text for p in doc.paragraphs)
    except ImportError:
        raise ImportError("python-docx is required for DOCX parsing")


def parse_pptx(file_path: Path) -> str:
    """Extract text from PPTX"""
    try:
        from pptx import Presentation

        prs = Presentation(str(file_path))
        text = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    text.append(shape.text)
        return "\n".join(text)
    except ImportError:
        raise ImportError("python-pptx is required for PPTX parsing")


def parse_document(file_path: Path, file_type: str) -> str:
    """Parse document based on file type"""
    parsers = {
        "pdf": parse_pdf,
        "docx": parse_docx,
        "pptx": parse_pptx,
        "txt": lambda p: p.read_text(encoding="utf-8", errors="replace"),
        "md": lambda p: p.read_text(encoding="utf-8", errors="replace"),
    }

    parser = parsers.get(file_type)
    if not parser:
        raise ValueError(f"Unsupported file type: {file_type}")

    return parser(file_path)


class InMemoryStore:
    """Simple in-memory chunk storage for demo purposes"""

    def __init__(self):
        self.chunks: dict[int, list[dict]] = {}

    def add_chunks(self, doc_id: int, chunks: list[str]) -> None:
        self.chunks[doc_id] = [
            {"id": i, "doc_id": doc_id, "text": chunk}
            for i, chunk in enumerate(chunks)
        ]

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """Simple keyword-based search"""
        query_terms = set(query.lower().split())
        results = []

        for doc_id, chunks in self.chunks.items():
            for chunk in chunks:
                chunk_terms = set(chunk["text"].lower().split())
                overlap = len(query_terms & chunk_terms)
                if overlap > 0:
                    results.append((overlap, chunk))

        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:top_k]]

    def get_course_chunks(self, course_id: int, limit: int = 10) -> list[dict]:
        doc_ids = [d for d, c in self.doc_courses.items() if c == course_id]
        all_chunks = []
        for doc_id in doc_ids:
            all_chunks.extend(self.chunks.get(doc_id, []))
        return all_chunks[:limit]

    def remove_document(self, doc_id: int) -> None:
        self.chunks.pop(doc_id, None)
        self.doc_courses.pop(doc_id, None)


# Global in-memory store (will be replaced with Qdrant later)
store = InMemoryStore()


async def process_document(doc: DocModel, file_path: Path) -> list[str]:
    """Process a document: parse, chunk, and store"""
    raw_text = parse_document(file_path, doc.file_type)
    clean_text = parse_text(raw_text)
    chunks = split_text(clean_text)

    store.add_chunks(doc.id, chunks, course_id=doc.course_id)
    return chunks


async def retrieve_context(query: str, course_id: int, top_k: int = 5) -> str:
    """Retrieve relevant context for a query"""
    results = store.search(query, top_k=top_k)

    if not results:
        return ""

    context_parts = []
    for i, chunk in enumerate(results, 1):
        context_parts.append(f"[{i}] {chunk['text']}")

    return "\n\n".join(context_parts)