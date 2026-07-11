from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import register_routers
from app.database import init_db
from app.rag import init_stores, reprocess_existing_documents


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_stores()
    
    # Rebuild chunk stores in background (don't block startup)
    import asyncio
    async def _background_reprocess():
        try:
            await reprocess_existing_documents()
        except Exception as e:
            from app.logging_config import logger
            logger.warning(f"Background reprocess failed: {e}")
    
    asyncio.create_task(_background_reprocess())
    
    yield


app = FastAPI(
    title="AI Study Assistant API",
    description="AI 智能备考助手后端 API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

register_routers(app)
