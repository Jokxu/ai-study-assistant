from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models.wrong_question import WrongQuestion as WQModel
from app.models.user import User
from app.schemas import UserResponse
from app.services.auth import get_current_user


class WrongQuestionCreate(BaseModel):
    course_id: int
    question: str
    user_answer: str
    correct_answer: Optional[str] = None
    feedback: Optional[str] = None
    tags: Optional[str] = None


class WrongQuestionResponse(BaseModel):
    id: int
    user_id: int
    course_id: int
    question: str
    correct_answer: Optional[str] = None
    user_answer: str
    feedback: Optional[str] = None
    tags: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


router = APIRouter(prefix="/api/wrong-questions", tags=["wrong_questions"])


@router.get("/course/{course_id}", response_model=list[WrongQuestionResponse])
async def list_wrong_questions(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WQModel)
        .where(WQModel.user_id == current_user.id, WQModel.course_id == course_id)
        .order_by(WQModel.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=WrongQuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_wrong_question(
    data: WrongQuestionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wq = WQModel(
        user_id=current_user.id,
        course_id=data.course_id,
        question=data.question,
        correct_answer=data.correct_answer or "",
        user_answer=data.user_answer,
        feedback=data.feedback or "",
        tags=data.tags or "",
    )
    db.add(wq)
    await db.commit()
    await db.refresh(wq)
    return wq


@router.delete("/{wq_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wrong_question(
    wq_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WQModel).where(WQModel.id == wq_id, WQModel.user_id == current_user.id)
    )
    wq = result.scalar_one_or_none()
    if not wq:
        raise HTTPException(status_code=404, detail="错题不存在")
    await db.delete(wq)
    await db.commit()
