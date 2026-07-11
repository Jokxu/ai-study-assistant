from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ===== User Schemas =====

class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    avatar: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ===== Course Schemas =====

class CourseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#3B82F6"


class CourseResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ===== Document Schemas =====

class DocumentResponse(BaseModel):
    id: int
    course_id: int
    original_filename: str
    file_type: str
    file_size: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ===== Chat Schemas =====

class ChatSessionCreate(BaseModel):
    course_id: int
    title: str = "新对话"


class ChatSessionResponse(BaseModel):
    id: int
    course_id: int
    title: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    sources: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str
    session_id: int


class ChatResponse(BaseModel):
    message: ChatMessageResponse
