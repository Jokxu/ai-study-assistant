"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import { wrongQuestionApi, type WrongQuestion } from "@/services/api";

export default function WrongQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);
  const { token } = useAuthStore();
  const [questions, setQuestions] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try { setQuestions(await wrongQuestionApi.list(courseId)); }
    catch { /* ignore */ }
    setLoading(false);
  }, [token, courseId]);

  useEffect(() => {
    if (!token) router.push("/login");
    else load();
  }, [token, router, load]);

  const handleDelete = async (id: number) => {
    try {
      await wrongQuestionApi.delete(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch { alert("删除失败"); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Link href={"/dashboard/courses/" + courseId} className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BookOpen className="mr-2 h-5 w-5 text-blue-600" />
          <span className="font-semibold">错题本</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : questions.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center text-gray-400">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-300" />
            <p className="text-lg font-medium">还没有错题</p>
            <p className="mt-1 text-sm">完成练习后，将做错的题目添加到错题本中复习</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm mb-2">{q.question}</h3>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                        <span className="text-red-600">你的答案：{q.user_answer}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                        <span className="text-green-600">正确答案：{q.correct_answer}</span>
                      </p>
                      {q.feedback && <p className="mt-2 text-gray-500 bg-gray-50 rounded p-2">{q.feedback}</p>}
                    </div>
                    {q.tags && <span className="mt-2 inline-block rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{q.tags}</span>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(q.id)} className="shrink-0">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
