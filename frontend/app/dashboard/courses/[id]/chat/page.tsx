"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Bot, User as UserIcon, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import { chatApi, documentApi, sendMessageStream, type ChatSession, type ChatMessage } from "@/services/api";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);
  const { token, user } = useAuthStore();

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [hasDocs, setHasDocs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const accumulatedRef = useRef(""); // Track full content for onDone

  const initSession = useCallback(async () => {
    if (!token) return;
    try {
      const docs = await documentApi.list(courseId);
      setHasDocs(docs.length > 0);

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
  }, [messages, streamContent]);

  const handleSend = async () => {
    if (!input.trim() || !session || sending) return;
    const msg = input.trim();
    setInput("");
    setSending(true);
    setStreamContent("");
    accumulatedRef.current = "";

    // Optimistic user message
    setMessages((prev) => [...prev, {
      id: Date.now(), session_id: session.id,
      role: "user", content: msg, sources: null, created_at: new Date().toISOString(),
    } as ChatMessage]);

    await sendMessageStream(
      session.id,
      msg,
      (token) => {
        accumulatedRef.current += token;
        setStreamContent(accumulatedRef.current);
      },
      () => {
        const finalContent = accumulatedRef.current;
        setMessages((prev) => [...prev, {
          id: Date.now() + 1, session_id: session.id,
          role: "assistant", content: finalContent, sources: null, created_at: new Date().toISOString(),
        } as ChatMessage]);
        setStreamContent("");
        setSending(false);
      },
      (err) => {
        setMessages((prev) => [...prev, {
          id: Date.now() + 1, session_id: session.id,
          role: "assistant",
          content: "发送失败：" + err,
          sources: null, created_at: new Date().toISOString(),
        } as ChatMessage]);
        setStreamContent("");
        setSending(false);
      },
    );
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex h-14 items-center gap-3 border-b px-4 shrink-0">
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
        {messages.length === 0 && !streamContent && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Bot className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium">开始学习</p>
            <p className="mt-1 text-sm">上传教材后，向 AI 提问课程内容</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={"flex gap-3 " + (msg.role === "user" ? "justify-end" : "")}>
            {msg.role === "assistant" && (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
            )}
            <div className={"max-w-[80%] rounded-lg px-4 py-2.5 overflow-hidden " + (
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900"
            )}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-blue-600 prose-code:bg-gray-200 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              )}
              {msg.sources && (
                <details className="mt-2 pt-1 border-t border-gray-200">
  <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">查看引用来源</summary>
  <p className="mt-1 text-xs text-gray-500 whitespace-pre-wrap leading-relaxed">{msg.sources}</p>
</details>
              )}
            </div>
            {msg.role === "user" && (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                <UserIcon className="h-4 w-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {streamContent && (
          <div className="flex gap-3">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
            <div className="max-w-[80%] rounded-lg bg-gray-100 px-4 py-2.5 overflow-hidden">
              <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-blue-600 prose-code:bg-gray-200 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {streamContent}
                </ReactMarkdown>
              </div>
              <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t p-4 shrink-0">
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

