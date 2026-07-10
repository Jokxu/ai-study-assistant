# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.chat import ChatSession, ChatMessage
from app.models.course import Course
from app.models.user import User
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageResponse,
)
from app.services.auth import get_current_user
from app.services.ai import ask, build_messages
from app.rag.service import retrieve_context

router = APIRouter(prefix="/api/chats", tags=["chats"])


@router.get("/course/{course_id}", response_model=list[ChatSessionResponse])
async def list_sessions(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.course_id == course_id)
        .order_by(ChatSession.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = ChatSession(course_id=data.course_id, title=data.title)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/{session_id}/messages", response_model=list[ChatMessageResponse])
async def list_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return result.scalars().all()


@router.post("/{session_id}/messages", response_model=ChatResponse)
async def send_message(
    session_id: int,
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get session
    session_result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    # Save user message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=data.message,
    )
    db.add(user_msg)
    await db.commit()

    # Retrieve context from documents
    context = await retrieve_context(data.message, session.course_id)

    # Build AI messages
    messages = build_messages("chat", data.message, context=context)

    # Get AI response
    try:
        ai_content = await ask(messages)
    except Exception as e:
        ai_content = f"抱歉，AI 服务暂时不可用：{str(e)}"

    # Save AI message
    ai_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=ai_content,
        sources=context[:200] + "..." if context else None,
    )
    db.add(ai_msg)

    # Update session timestamp
    session.updated_at = None

    await db.commit()
    await db.refresh(ai_msg)

    return ChatResponse(message=ChatMessageResponse.model_validate(ai_msg))