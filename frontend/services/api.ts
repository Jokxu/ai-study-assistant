const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  delete: (id: number) => request<void>("/api/courses/" + id, { method: "DELETE" }),
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
    return request<Document>("/api/documents/upload/" + courseId, {
      method: "POST",
      body: formData,
    });
  },
  delete: (docId: number) => request<void>("/api/documents/" + docId, { method: "DELETE" }),
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
    request<ChatSession>("/api/chats", { method: "POST", body: JSON.stringify({ course_id: courseId, title: title || "新对话" }) }),
  listMessages: (sessionId: number) => request<ChatMessage[]>("/api/chats/" + sessionId + "/messages"),
  sendMessage: (sessionId: number, message: string) => {
    const body = { message, session_id: sessionId };
    return request<{ message: ChatMessage }>("/api/chats/" + sessionId + "/messages", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};