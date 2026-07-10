"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, LogOut, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store";
import { courseApi, type Course } from "@/services/api";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const loadCourses = useCallback(async () => {
    if (!token) return;
    try {
      const data = await courseApi.list();
      setCourses(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!token) router.push("/login");
    else loadCourses();
  }, [token, router, loadCourses]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await courseApi.create({ name: newName, description: newDesc });
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      await loadCourses();
    } catch { /* ignore */ }
    setCreating(false);
  };

  const handleLogout = () => { logout(); router.push("/login"); };

  if (!user) return null;

  const courseColors: Record<string, string> = {
    "数学": "#EF4444", "英语": "#3B82F6", "数据结构": "#10B981",
    "操作系统": "#F59E0B", "机器学习": "#8B5CF6",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <span className="font-semibold">AI Study Assistant</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">我的课程</h1>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            创建课程
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">还没有课程</p>
            <p className="mt-1 mb-4 text-sm text-gray-400">创建你的第一个课程，开始学习吧</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />创建课程
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={"/dashboard/courses/" + course.id}
                className="group rounded-lg border bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div
                  className="mb-3 h-1.5 w-12 rounded-full"
                  style={{ backgroundColor: course.color || "#3B82F6" }}
                />
                <h3 className="font-semibold text-gray-900">{course.name}</h3>
                {course.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{course.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-lg font-semibold">创建课程</h2>
              <div className="space-y-3">
                <Input label="课程名称" placeholder="例：高等数学" value={newName}
                  onChange={(e) => setNewName(e.target.value)} required />
                <Input label="课程描述（选填）" placeholder="简要介绍这门课程" value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
                <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                  {creating ? "创建中..." : "创建"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}