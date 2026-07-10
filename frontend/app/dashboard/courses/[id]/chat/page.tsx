"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Bot, User as UserIcon, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import { chatApi, documentApi, type ChatSession, type ChatMessage } from "@/services/api";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);
  const { token, user } = useAuthStore();

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasDocs, setHasDocs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const initSession = useCallback(async () => {
    if (!token) return;
    try {
      // Check if there are documents
      const docs = await documentApi.list(courseId);
      setHasDocs(docs.length > 0);

      // Get or create chat session
      const sessions = await chatApi.listSessions(courseId);
      let currentSession: ChatSession;
      if (sessions.length > 0) {
        currentSession = sessions[0];
      } else {
        currentSession = await chatApi.createSession(courseId);
      }
      setSession(currentSession);
      const msgs = await chatApi.listMessages(currentSession.id);
      setMessages(msgs);
    } catch {
      router.push("/dashboard/courses/" + courseId);
    }
  }, [token, courseId, router]);

  useEffect(() => {
    if (!token) router.push("/login");
    else initSession();
  }, [token, router, initSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !session || sending) return;
    const msg = input.trim();
    setInput("");
    setSending(true);

    // Optimistically add user message
    setMessages((prev) => [...prev, {
      id: Date.now(), session_id: session.id,
      role: "user", content: msg, sources: null, created_at: new Date().toISOString(),
    } as ChatMessage]);

    try {
      const res = await chatApi.sendMessage(session.id, msg);
      setMessages((prev) => [...prev, res.message]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: Date.now(), session_id: session.id,
        role: "assistant", content: "抱歉，发送失败：" + (err instanceof Error ? err.message : "未知错误"),
        sources: null, created_at: new Date().toISOString(),
      } as ChatMessage]);
    }
    setSending(false);
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex h-14 items-center gap-3 border-b px-4">
        <Link href={"/dashboard/courses/" + courseId} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <BookOpen className="h-5 w-5 text-blue-600" />
        <span className="font-semibold">AI 问答</span>
        {!hasDocs && (
          <span className="ml-auto text-xs text-amber-500">尚未上传教材</span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Bot className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium">开始学习</p>
            <p className="mt-1 text-sm">上传教材后，向 AI 提问课程内容</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={"flex gap-3 " + (msg.role === "user" ? "justify-end" : "")}>
            {msg.role === "assistant" && (
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
            )}
            <div className={"max-w-[80%] rounded-lg px-4 py-2.5 " + (
              msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
            )}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              {msg.sources && (
                <p className="mt-2 text-xs text-gray-400 border-t border-gray-200 pt-1">来源：教材内容</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                <UserIcon className="h-4 w-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
            <div className="rounded-lg bg-gray-100 px-4 py-2.5">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={hasDocs ? "输入你的问题..." : "上传教材后即可提问"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={!input.trim() || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}