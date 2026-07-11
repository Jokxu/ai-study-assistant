# AI Study Assistant

智能备考助手 — 基于 RAG + DeepSeek API + 中文优化的 AI 学习平台。

## 技术栈

**前端**: Next.js 15 + React 19 + TypeScript + TailwindCSS  
**后端**: FastAPI + SQLAlchemy Async + Alembic + PostgreSQL  
**AI**: DeepSeek API + sentence-transformers (BAAI/bge-small-zh-v1.5, 512维)  
**向量**: Qdrant (Docker)  
**部署**: Docker Compose

## 快速启动

```bash
# 1. 启动 PostgreSQL + Qdrant
docker compose up -d postgres qdrant

# 2. 启动后端
cd backend
pip install -e .
python -X utf8 -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 3. 启动前端
cd frontend
pnpm install
npx next dev --port 3001
```

或使用启动脚本:

```powershell
.\start.ps1
```

访问 **http://localhost:3001** | 测试账号: **demo / demo123**

## 功能

- 课程管理 + 文档上传 (PDF/DOCX/PPTX/TXT/MD)
- AI 问答 (SSE 流式 + Markdown 渲染)
- RAG 检索 (Qdrant 向量 + bge-small-zh-v1.5，中英文混合)
- AI 章节总结 / 概念讲解 / 自动出题 / 学习计划
- 错题本管理
- PostgreSQL + Qdrant Docker 部署

## 环境变量

参见 `backend/.env.example`

## 项目结构

```
backend/app/
  api/        # API 路由
  models/     # 数据库模型
  rag/        # RAG 检索 (Qdrant + Embedding)
  services/   # AI 服务 + 认证
frontend/
  app/        # Next.js 页面
  services/   # API 客户端
```
