# -*- coding: utf-8 -*-
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session as create_async_session
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
from app.services.ai import ask, build_messages, chat_completion_stream
from app.rag.service import retrieve_context

router = APIRouter(prefix="/api/chats", tags=["chats"])


@router.get("/course/{course_id}", response_model=list[ChatSessionResponse])
async def list_sessions(
    course_id: int,
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
    db: AsyncSession = Depends(get_db),
):
    session_result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=data.message,
    )
    db.add(user_msg)
    await db.commit()

    context = await retrieve_context(data.message, session.course_id)
    messages = build_messages("chat", data.message, context=context)

    try:
        ai_content = await ask(messages)
    except Exception as e:
        ai_content = f"抱歉，AI 服务暂时不可用：{str(e)}"

    ai_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=ai_content,
        sources=context[:200] + "..." if context else None,
    )
    db.add(ai_msg)
    session.updated_at = None
    await db.commit()
    await db.refresh(ai_msg)

    return ChatResponse(message=ChatMessageResponse.model_validate(ai_msg))


# ===== Streaming =====

async def _stream_ai_response(session_id: int, user_message: str, course_id: int):
    """Async generator: save user msg, stream AI tokens, save assistant msg."""
    async with create_async_session() as db:
        # Save user message
        user_msg = ChatMessage(session_id=session_id, role="user", content=user_message)
        db.add(user_msg)
        await db.commit()

        # Retrieve context
        context = await retrieve_context(user_message, course_id)
        messages = build_messages("chat", user_message, context=context)

        full_content = ""
        try:
            async for token in chat_completion_stream(messages):
                full_content += token
                yield f"data: {json.dumps({'token': token}, ensure_ascii=False)}\n\n"
        except Exception as e:
            error_msg = f"抱歉，AI 服务暂时不可用：{str(e)}"
            full_content = error_msg
            yield f"data: {json.dumps({'token': error_msg}, ensure_ascii=False)}\n\n"

        # Save AI message
        ai_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=full_content,
            sources=context[:200] + "..." if context else None,
        )
        db.add(ai_msg)

        # Update session timestamp
        sess_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        sess = sess_result.scalar_one_or_none()
        if sess:
            sess.updated_at = None

        await db.commit()

        yield f"data: {json.dumps({'done': True, 'message_id': ai_msg.id}, ensure_ascii=False)}\n\n"


@router.post("/{session_id}/messages/stream")
async def send_message_stream(
    session_id: int,
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """SSE streaming endpoint for chat messages."""
    # Validate session exists
    sess_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    return StreamingResponse(
        _stream_ai_response(session_id, data.message, session.course_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
