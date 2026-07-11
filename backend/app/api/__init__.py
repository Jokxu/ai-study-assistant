from app.api.auth import router as auth_router
from app.api.courses import router as courses_router
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router
from app.api.ai_tools import router as ai_tools_router
from app.api.wrong_questions import router as wrong_questions_router

routers = [auth_router, courses_router, documents_router, chat_router, ai_tools_router, wrong_questions_router]


def register_routers(app):
    for router in routers:
        app.include_router(router)
