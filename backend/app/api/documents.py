# -*- coding: utf-8 -*-
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db, async_session
from app.models.document import Document as DocModel
from app.models.course import Course
from app.models.user import User
from app.schemas import DocumentResponse
from app.services.auth import get_current_user
from app.rag.service import process_document

router = APIRouter(prefix="/api/documents", tags=["documents"])
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".md"}


async def _process_background(doc_id: int, file_path) -> None:
    """Process document in background."""
    from app.database import async_session
    try:
        async with async_session() as db:
            from app.rag.service import process_document
            from app.models.document import Document as DM
            from sqlalchemy import select
            r = await db.execute(select(DM).where(DM.id == doc_id))
            d = r.scalar_one_or_none()
            if not d:
                return
            await process_document(d, file_path)
            d.status = "ready"
            await db.commit()
    except Exception as e:
        print(f"BG error: {e}")
        try:
            async with async_session() as db:
                from app.models.document import Document as DM
                from sqlalchemy import select
                r = await db.execute(select(DM).where(DM.id == doc_id))
                d = r.scalar_one_or_none()
                if d:
                    d.status = "error"
                    await db.commit()
        except:
            pass

@router.post("/upload/{course_id}", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    course_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    saved_name = f"{file_id}{ext}"
    saved_path = upload_dir / saved_name
    content = await file.read()
    saved_path.write_bytes(content)
    course_result = await db.execute(
        select(Course).where(Course.id == course_id, Course.user_id == current_user.id)
    )
    course = course_result.scalar_one_or_none()
    if not course:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(status_code=404, detail="Course not found")
    doc = DocModel(
        course_id=course_id,
        filename=saved_name,
        original_filename=file.filename,
        file_type=ext[1:],
        file_size=len(content),
        status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    import asyncio
    asyncio.create_task(_process_background(doc.id, saved_path))
    return doc


@router.get("/course/{course_id}", response_model=list[DocumentResponse])
async def list_documents(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DocModel).where(DocModel.course_id == course_id)
    )
    return result.scalars().all()


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DocModel).where(DocModel.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    file_path = Path(settings.upload_dir) / doc.filename
    if file_path.exists():
        file_path.unlink()
    await db.delete(doc)
    await db.commit()
