"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Upload, FileText, Trash2, MessageSquare,
  Loader2, BookOpen, FileText as FileTextIcon, Brain,
  GraduationCap, Lightbulb, Compass, X, AlertCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store";
import { courseApi, documentApi, aiToolsApi, type Course, type Document } from "@/services/api";

type ToolType = "summary" | "quiz" | "explain" | "roadmap" | "grade" | null;

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = Number(params.id);
  const { token } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [quizCount, setQuizCount] = useState(5);
  const [quizType, setQuizType] = useState("选择题");
  const [quizTopics, setQuizTopics] = useState("");
  const [explainInput, setExplainInput] = useState("");
  const [roadmapGoal, setRoadmapGoal] = useState("");
const [gradeQuestion, setGradeQuestion] = useState("");
const [gradeAnswer, setGradeAnswer] = useState("");
const [gradeCorrect, setGradeCorrect] = useState("");
  

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [c, d] = await Promise.all([
        courseApi.get(courseId),
        documentApi.list(courseId),
      ]);
      setCourse(c);
      setDocs(d);
    } catch { router.push("/dashboard"); }
    setLoading(false);
  }, [token, courseId, router]);

  useEffect(() => {
    if (!token) router.push("/login");
    else loadData();
  }, [token, router, loadData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await documentApi.upload(courseId, file);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "上传失败");
    }
    setUploading(false);
  };

  const handleDelete = async (docId: number) => {
    try {
      await documentApi.delete(docId);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch { alert("删除失败"); }
  };

  const hasDocuments = docs.some((d) => d.status === "ready");

  const runTool = async (tool: ToolType) => {
    if (!tool || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    setAiResult("");

    try {
      let res;
      switch (tool) {
        case "summary":
          res = await aiToolsApi.summary(courseId);
          break;
        case "quiz":
          res = await aiToolsApi.quiz(courseId, quizCount, quizType, quizTopics);
          break;
        case "explain":
          res = await aiToolsApi.explain(courseId, explainInput);
          break;
        
        case "roadmap":
          res = await aiToolsApi.roadmap(courseId, roadmapGoal || undefined);
          break;
        default:
          res = null;
          break;
      }
      setAiResult(res?.content ?? "");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI 请求失败");
    }
    setAiLoading(false);
  };

  const openTool = (tool: ToolType) => {
    setAiResult("");
    setAiError("");
    setActiveTool(tool);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  const toolCards = [
    { type: "summary" as ToolType, icon: Brain, color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200", title: "章节总结", desc: "AI 自动生成课程内容总结" },
    { type: "quiz" as ToolType, icon: GraduationCap, color: "text-green-500", bg: "bg-green-50", border: "border-green-200", title: "出题测试", desc: "根据教材生成练习题" },
    { type: "explain" as ToolType, icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200", title: "概念讲解", desc: "通俗易懂解释知识点" },
    
    { type: "roadmap" as ToolType, icon: Compass, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-200", title: "学习计划", desc: "制定个性化学习路线" },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <Link href="/dashboard" className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BookOpen className="mr-2 h-5 w-5 text-blue-600" />
          <span className="font-semibold">{course.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        {course.description && (
          <p className="mb-6 text-sm text-gray-500">{course.description}</p>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ">
          <Link
            href={"/dashboard/courses/" + courseId + "/chat"}
            className="flex items-center gap-3 rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
          >
            <MessageSquare className="h-8 w-8 text-blue-500" />
            <div>
              <p className="font-semibold text-sm">AI Chat</p>
              <p className="text-xs text-gray-500">智能问答</p>
            </div>
          </Link>
          <Link
            href={"/dashboard/courses/" + courseId + "/wrong-questions"}
            className="flex items-center gap-3 rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
          >
            <AlertCircle className="h-8 w-8 text-orange-400" />
            <div>
              <p className="font-semibold text-sm">错题本</p>
              <p className="text-xs text-gray-500">复习错题</p>
            </div>
          </Link>

          {toolCards.map((tc) => (
            <button
              key={tc.type}
              onClick={() => openTool(tc.type)}
              disabled={!hasDocuments}
              className="flex items-center gap-3 rounded-lg border bg-white p-4 text-left transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className={"rounded-lg " + tc.bg + " p-2"}>
                <tc.icon className={"h-5 w-5 " + tc.color} />
              </div>
              <div>
                <p className="font-semibold text-sm">{tc.title}</p>
                <p className="text-xs text-gray-500">{tc.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileTextIcon className="h-5 w-5 text-gray-400" />
            教材资料
            {docs.length > 0 && (
              <span className="text-sm font-normal text-gray-400">({docs.length})</span>
            )}
          </h2>
          <label className="cursor-pointer">
            <span className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Upload className="mr-2 h-4 w-4" />
              上传文件
            </span>
            <input type="file" className="hidden" accept=".pdf,.docx,.pptx,.txt,.md"
              onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {docs.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
            <FileText className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">还没有上传教材资料</p>
            <p className="text-xs text-gray-300 mt-1">支持 PDF、DOCX、PPTX、TXT、MD 格式</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.original_filename}</p>
                    <p className="text-xs text-gray-400">
                      {formatSize(doc.file_size)}
                      <span className="mx-1">·</span>
                      {doc.file_type.toUpperCase()}
                      <span className="mx-1">·</span>
                      {doc.status === "ready" ? (
                        <span className="text-green-500">就绪</span>
                      ) : doc.status === "error" ? (
                        <span className="text-red-500">解析失败</span>
                      ) : (
                        <span className="text-amber-500">处理中...</span>
                      )}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)} className="shrink-0">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在上传并解析...
          </div>
        )}

        {!hasDocuments && docs.length > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            教材正在解析中，完成后才能使用 AI 工具
          </div>
        )}
      </main>

      {activeTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setActiveTool(null)}>
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const tc = toolCards.find((t) => t.type === activeTool);
                  if (!tc) return null;
                  const Icon = tc.icon;
                  return (
                    <>
                      <div className={"rounded-lg " + tc.bg + " p-1.5"}>
                        <Icon className={"h-5 w-5 " + tc.color} />
                      </div>
                      <h3 className="text-lg font-semibold">{tc.title}</h3>
                    </>
                  );
                })()}
              </div>
              <button onClick={() => setActiveTool(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {aiError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {aiError}
                </div>
              )}

              {!aiResult && !aiLoading && (
                <div className="space-y-4">
                  {activeTool === "quiz" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">知识点标签（可选）</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例如：机器学习、神经网络、监督学习（用逗号分隔）"
                        value={quizTopics}
                        onChange={(e) => setQuizTopics(e.target.value)}
                      />
                      <div className="mt-3" />
                    </div>
                  )}
                  {activeTool === "quiz" && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">题目数量</label>
                        <div className="flex gap-2">
                          {[3, 5, 10].map((n) => (
                            <Button key={n} variant={quizCount === n ? "default" : "outline"} size="sm" onClick={() => setQuizCount(n)}>{n} 道</Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">题目类型</label>
                        <div className="flex gap-2">
                          {["选择题", "填空题", "判断题", "问答题", "混合"].map((t) => (
                            <Button key={t} variant={quizType === t ? "default" : "outline"} size="sm" onClick={() => setQuizType(t)}>{t}</Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {activeTool === "explain" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">输入你要理解的概念或知识点</label>
                      <textarea
                        className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="例如：贝叶斯定理、递归算法..."
                        value={explainInput}
                        onChange={(e) => setExplainInput(e.target.value)}
                      />
                    </div>
                  )}
                  {activeTool === "grade" && (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">题目</label>
                        <textarea className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="输入题目内容..." value={gradeQuestion} onChange={(e) => setGradeQuestion(e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">学生答案</label>
                        <textarea className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="输入学生的答案..." value={gradeAnswer} onChange={(e) => setGradeAnswer(e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">参考答案（可选）</label>
                        <textarea className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="输入标准答案..." value={gradeCorrect} onChange={(e) => setGradeCorrect(e.target.value)} />
                      </div>
                    </div>
                  )}
                  {activeTool === "roadmap" && (

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">你的学习目标（可选）</label>
                      <textarea
                        className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="例如：一个月内掌握基础，通过期末考试"
                        value={roadmapGoal}
                        onChange={(e) => setRoadmapGoal(e.target.value)}
                      />
                    </div>
                  )}
                  {activeTool === "summary" && (
                    <p className="text-sm text-gray-500">将基于已上传的教材内容生成详细章节总结，包括核心知识点、重点内容、难点解析和考试高频考点。</p>
                  )}
                </div>
              )}

              {aiLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-500" />
                  <p className="text-sm text-gray-500">AI 正在生成中，请稍候...</p>
                </div>
              )}

              {aiResult && (
                <div className="prose prose-sm max-w-none">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {aiResult}
  </ReactMarkdown>
</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              {aiResult ? (
                <>
                  <Button variant="outline" onClick={() => { setAiResult(""); setAiError(""); }}>
                    重新生成
                  </Button>
                  <Button onClick={() => { navigator.clipboard.writeText(aiResult); }}>
                    复制内容
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setActiveTool(null)}>取消</Button>
                  <Button
                    onClick={() => runTool(activeTool)}
                    disabled={aiLoading || (activeTool === "explain" && !explainInput.trim())}
                  >
                    {aiLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />生成中...</>
                    ) : "开始生成"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



