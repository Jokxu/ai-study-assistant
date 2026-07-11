const API_BASE = "";

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  const response = await fetch(API_BASE + endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || ("HTTP " + response.status));
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// ===== Auth =====

export interface User {
  id: number; username: string; email: string; avatar: string | null; created_at: string;
}

export interface TokenResponse {
  access_token: string; token_type: string; user: User;
}

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    request<User>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { username: string; password: string }) =>
    request<TokenResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request<User>("/api/auth/me"),
};

// ===== Courses =====

export interface Course {
  id: number; user_id: number; name: string; description: string | null;
  color: string | null; created_at: string;
}

export const courseApi = {
  list: () => request<Course[]>("/api/courses"),
  get: (id: number) => request<Course>("/api/courses/" + id),
  create: (data: { name: string; description?: string; color?: string }) =>
    request<Course>("/api/courses", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { name: string; description?: string; color?: string }) =>
    request<Course>("/api/courses/" + id, { method: "PUT", body: JSON.stringify(data) }),
  "delete": (id: number) => request<void>("/api/courses/" + id, { method: "DELETE" }),
};

// ===== Documents =====

export interface Document {
  id: number; course_id: number; original_filename: string; file_type: string;
  file_size: number; status: string; created_at: string;
}

export const documentApi = {
  list: (courseId: number) => request<Document[]>("/api/documents/course/" + courseId),
  upload: (courseId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    return fetch("http://localhost:8000/api/documents/upload/" + courseId, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData,
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({ detail: "Upload failed" }))).detail);
      return r.json();
    });
  },
  "delete": (docId: number) => request<void>("/api/documents/" + docId, { method: "DELETE" }),
};

// ===== Chat =====

export interface ChatSession {
  id: number; course_id: number; title: string; created_at: string; updated_at: string;
}

export interface ChatMessage {
  id: number; session_id: number; role: string; content: string; sources: string | null; created_at: string;
}

export const chatApi = {
  listSessions: (courseId: number) => request<ChatSession[]>("/api/chats/course/" + courseId),
  createSession: (courseId: number, title?: string) =>
    request<ChatSession>("/api/chats", { method: "POST", body: JSON.stringify({ course_id: courseId, title: title || "New Chat" }) }),
  listMessages: (sessionId: number) => request<ChatMessage[]>("/api/chats/" + sessionId + "/messages"),
  sendMessage: (sessionId: number, message: string) => {
    const body = { message, session_id: sessionId };
    return request<{ message: ChatMessage }>("/api/chats/" + sessionId + "/messages", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
// ===== AI Tools =====

export interface AIActionResponse {
  content: string;
  action: string;
}

export const aiToolsApi = {
  summary: (courseId: number, promptExtra?: string) =>
    request<AIActionResponse>("/api/ai/summary/" + courseId, {
      method: "POST",
      body: JSON.stringify({ prompt_extra: promptExtra || "" }),
    }),
  quiz: (courseId: number, questionCount?: number, questionTypes?: string, topics?: string, promptExtra?: string) =>
    request<AIActionResponse>("/api/ai/quiz/" + courseId, {
      method: "POST",
      body: JSON.stringify({ 
        prompt_extra: promptExtra || "", 
        question_count: questionCount || 5, 
        question_types: questionTypes || "Multiple Choice",
        topics: topics || "",
      }),
    }),
  explain: (courseId: number, concept: string) =>
    request<AIActionResponse>("/api/ai/explain/" + courseId, {
      method: "POST",
      body: JSON.stringify({ prompt_extra: concept }),
    }),
  roadmap: (courseId: number, goal?: string, promptExtra?: string) =>
    request<AIActionResponse>("/api/ai/roadmap/" + courseId, {
      method: "POST",
      body: JSON.stringify({ goal: goal || "", prompt_extra: promptExtra || "" }),
    }),
};

// ===== Streaming Chat =====

export async function sendMessageStream(
  sessionId: number,
  message: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): Promise<void> {
  const token = getToken();
  try {
    const response = await fetch("/api/chats/" + sessionId + "/messages/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ message, session_id: sessionId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Stream failed" }));
      onError(err.detail || "HTTP " + response.status);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.token) {
            onToken(parsed.token);
          }
        } catch { /* skip partial lines */ }
      }
    }

    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : "Stream error");
  }
}


// ===== Wrong Questions =====

export interface WrongQuestion {
  id: number; user_id: number; course_id: number;
  question: string; correct_answer: string | null;
  user_answer: string; feedback: string | null;
  tags: string | null; created_at: string;
}

export const wrongQuestionApi = {
  list: (courseId: number) => request<WrongQuestion[]>("/api/wrong-questions/course/" + courseId),
  create: (data: { course_id: number; question: string; user_answer: string; correct_answer?: string; feedback?: string; tags?: string }) =>
    request<WrongQuestion>("/api/wrong-questions", { method: "POST", body: JSON.stringify(data) }),
  "delete": (id: number) => request<void>("/api/wrong-questions/" + id, { method: "DELETE" }),
};




