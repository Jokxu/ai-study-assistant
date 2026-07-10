"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, Trash2, MessageSquare, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import { courseApi, documentApi, type Course, type Document } from "@/services/api";

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = Number(params.id);
  const { token } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
      alert(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
  };

  const handleDelete = async (docId: number) => {
    try {
      await documentApi.delete(docId);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch { alert("Delete failed"); }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
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

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Link
            href={"/dashboard/courses/" + courseId + "/chat"}
            className="flex items-center gap-3 rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
          >
            <MessageSquare className="h-8 w-8 text-blue-500" />
            <div>
              <p className="font-semibold">AI Chat</p>
              <p className="text-sm text-gray-500">Smart Q&A based on your materials</p>
            </div>
          </Link>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Materials</h2>
          <label className="cursor-pointer">
            <span className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </span>
            <input type="file" className="hidden" accept=".pdf,.docx,.pptx,.txt,.md"
              onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
        {docs.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
            <FileText className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">No materials uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{doc.original_filename}</p>
                    <p className="text-xs text-gray-400">{formatSize(doc.file_size)} - {doc.status === "ready" ? "Ready" : "Processing"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}