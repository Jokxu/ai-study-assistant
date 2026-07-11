# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.course import Course
from app.models.user import User
from app.services.auth import get_current_user
from app.services.ai import ask, build_messages
from app.rag.service import store, retrieve_context

router = APIRouter(prefix="/api/ai", tags=["ai_tools"])


class AIActionRequest(BaseModel):
    prompt_extra: str = ""


class AIActionResponse(BaseModel):
    content: str
    action: str


async def _get_course(course_id: int, user: User, db: AsyncSession) -> Course:
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.user_id == user.id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
    return course


async def _get_course_context(course_id: int, max_chunks: int = 20) -> str:
    chunks = store.get_course_chunks(course_id, limit=max_chunks)
    if not chunks:
        raise HTTPException(status_code=400, detail="该课程还没有上传教材，请先上传文档")
    parts = []
    for chunk in chunks:
        parts.append(chunk["text"])
    return "\n\n".join(parts)


@router.post("/summary/{course_id}", response_model=AIActionResponse)
async def generate_summary(
    course_id: int,
    data: AIActionRequest = AIActionRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course(course_id, current_user, db)
    context = await _get_course_context(course_id)

    user_prompt = data.prompt_extra if data.prompt_extra else "请基于以上教材内容，生成一份详细的章节总结"
    messages = build_messages("summary", user_prompt, context=context)
    content = await ask(messages)
    return AIActionResponse(content=content, action="summary")


class QuizRequest(BaseModel):
    prompt_extra: str = ""
    question_count: int = 5
    question_types: str = "选择题"


@router.post("/quiz/{course_id}", response_model=AIActionResponse)
async def generate_quiz(
    course_id: int,
    data: QuizRequest = QuizRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course(course_id, current_user, db)
    context = await _get_course_context(course_id)

    user_prompt = (
        f"请基于以上教材内容，生成 {data.question_count} 道{data.question_types}。"
        f"{data.prompt_extra}"
    )
    messages = build_messages("quiz", user_prompt, context=context)
    content = await ask(messages)
    return AIActionResponse(content=content, action="quiz")


@router.post("/explain/{course_id}", response_model=AIActionResponse)
async def explain_concept(
    course_id: int,
    data: AIActionRequest = AIActionRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course(course_id, current_user, db)
    context = await _get_course_context(course_id)

    if not data.prompt_extra:
        raise HTTPException(status_code=400, detail="请输入要解释的概念或知识点")

    user_prompt = f"请用通俗易懂的方式解释以下概念：{data.prompt_extra}"
    messages = build_messages("explain", user_prompt, context=context)
    content = await ask(messages)
    return AIActionResponse(content=content, action="explain")


class GradeRequest(BaseModel):
    question: str = ""
    student_answer: str = ""
    correct_answer: str = ""


@router.post("/grade", response_model=AIActionResponse)
async def grade_answer(
    data: GradeRequest,
    current_user: User = Depends(get_current_user),
):
    """Grade a student answer using AI."""
    if not data.question.strip() or not data.student_answer.strip():
        raise HTTPException(status_code=400, detail="请提供题目和学生答案")

    prompt = f"题目：{data.question}\n"
    if data.correct_answer:
        prompt += f"参考答案：{data.correct_answer}\n"
    prompt += f"\n学生答案：{data.student_answer}\n\n请批改以上答案，给出：\n1. 评分（百分制）\n2. 错误分析\n3. 正确答案\n4. 学习建议"

    messages = build_messages("grading", prompt)
    content = await ask(messages)
    return AIActionResponse(content=content, action="grade")


class GradeRequest(BaseModel):
    question: str = ""
    student_answer: str = ""
    correct_answer: str = ""


@router.post("/grade", response_model=AIActionResponse)
async def grade_answer(
    data: GradeRequest,
    current_user: User = Depends(get_current_user),
):
    if not data.question.strip() or not data.student_answer.strip():
        raise HTTPException(status_code=400, detail="请提供题目和学生答案")

    prompt = f"题目：{data.question}\n"
    if data.correct_answer:
        prompt += f"参考答案：{data.correct_answer}\n"
    prompt += f"\n学生答案：{data.student_answer}\n\n请批改以上答案，给出：\n1. 评分（百分制）\n2. 错误分析\n3. 正确答案\n4. 学习建议"

    messages = build_messages("grading", prompt)
    content = await ask(messages)
    return AIActionResponse(content=content, action="grade")


class RoadmapRequest(BaseModel):
    prompt_extra: str = ""
    goal: str = ""


@router.post("/roadmap/{course_id}", response_model=AIActionResponse)
async def generate_roadmap(
    course_id: int,
    data: RoadmapRequest = RoadmapRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course(course_id, current_user, db)
    context = await _get_course_context(course_id)

    goal = data.goal if data.goal else "系统掌握该课程"
    user_prompt = (
        f"用户的学习目标是：{goal}\n"
        f"请根据教材内容制定一份合理的学习计划，分天安排学习内容。\n"
        f"{data.prompt_extra}"
    )
    messages = build_messages("roadmap", user_prompt, context=context)
    content = await ask(messages)
    return AIActionResponse(content=content, action="roadmap")




