import json
from typing import AsyncGenerator, Optional

import httpx

from app.config import settings


SYSTEM_PROMPTS = {
    "chat": "你是一名 AI 学习助手。使用提供的教材内容回答用户的问题。如果没有足够的信息，诚实地告诉用户你不知道。回答要清晰、准确，适合学习场景。",
    "summary": "你是一名优秀教师。请阅读以下教材内容，生成：1. 核心知识点 2. 重点内容 3. 难点解析 4. 考试高频考点 5. 一句话总结",
    "quiz": "你是一名考试出题专家。根据以下教材内容，生成指定数量和题型的学习测试题。题目要覆盖重点知识点，难度适中，选项要有干扰性。",
    "explain": "你是一名耐心的导师。请用通俗易懂的方式解释这个概念，用类比和例子帮助理解。",
    "grading": "你是一名严格的老师。请批改以下学生的答案，给出分数、错误原因和正确答案。",
    "roadmap": "你是一名学习规划师。请根据教材内容和用户的学习目标，制定一个合理的学习计划，分天安排学习内容。",
}


async def chat_completion(
    messages: list[dict],
    model: Optional[str] = None,
    stream: bool = False,
    temperature: float = 0.7,
) -> dict:
    """Call DeepSeek chat completion API"""
    headers = {
        "Authorization": f"Bearer {settings.deepseek_api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model or settings.deepseek_model,
        "messages": messages,
        "temperature": temperature,
        "stream": stream,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{settings.deepseek_api_base}/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        return response.json()


def build_messages(
    prompt_type: str,
    user_content: str,
    context: Optional[str] = None,
    system_override: Optional[str] = None,
) -> list[dict]:
    """Build message list for DeepSeek API"""
    system_prompt = system_override or SYSTEM_PROMPTS.get(prompt_type, SYSTEM_PROMPTS["chat"])

    messages = [{"role": "system", "content": system_prompt}]

    if context:
        messages.append({"role": "system", "content": f"以下是教材内容：\n\n{context}"})

    messages.append({"role": "user", "content": user_content})
    return messages


async def ask(
    messages: list[dict],
    model: Optional[str] = None,
) -> str:
    """Simple wrapper: send messages and get text response"""
    result = await chat_completion(messages, model=model)
    return result["choices"][0]["message"]["content"]