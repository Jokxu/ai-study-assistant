# AI Study Assistant（AI 智能备考助手）

基于 RAG + DeepSeek API 的 AI 学习平台，支持教材知识库、智能问答、自动总结、AI 出题和个性化学习计划。

## 技术栈

- **前端**：Next.js + React + TypeScript + TailwindCSS + shadcn/ui
- **后端**：Python + FastAPI + SQLAlchemy + Alembic
- **AI**：DeepSeek API + LangChain + BGE-M3 Embedding + Qdrant
- **数据库**：PostgreSQL + Qdrant

## 功能特性

- 教材上传（PDF、PPT、Word、TXT）
- RAG 智能问答
- AI 章节总结
- AI 自动出题
- AI 批改
- 学习计划
- 错题管理

## 项目结构

```
ai-study-assistant/
├── frontend/         # Next.js 前端
├── backend/          # FastAPI 后端
├── docker/           # Docker 配置
├── docs/             # 文档
├── uploads/          # 上传文件
└── docker-compose.yml
```
